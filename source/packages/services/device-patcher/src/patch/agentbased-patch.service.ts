/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import ow from 'ow';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';

import { AssociationModel, PatchItem, PatchSource } from './patch.model';
import { ActivationDao } from '../activation/activation.dao';
import { AgentbasedPatchDao } from './agentbased-patch.dao';
import { ExpressionParser } from '../utils/expression.util';
import { DescribeInstanceInformationRequest } from 'aws-sdk/clients/ssm';
import { PatchTemplatesService } from '../templates/template.service';


@injectable()
export class AgentbasedPatchService {

    private readonly ssm: AWS.SSM;
    private readonly sqs: AWS.SQS;

    private queueUrl: string = process.env.AWS_SQS_QUEUES_PATCH_TASKS;
    private ssmAnsiblePatchDocument = 'AWS-ApplyAnsiblePlaybooks';

    constructor(
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS,
        @inject(TYPES.ActivationDao) private activationDao: ActivationDao,
        @inject(TYPES.AgentbasedPatchDao) private agentbasedPatchDao: AgentbasedPatchDao,
        @inject(TYPES.ExpressionParser) private expressionParser: ExpressionParser,
        @inject(TYPES.PatchTemplatesService) private templatesService: PatchTemplatesService,
        @inject('aws.s3.bucket') private artifactsBucket: string,
        @inject('aws.s3.prefix') private artifactsBucketPrefix: string
    ) {
        this.ssm = ssmFactory();
        this.sqs = sqsFactory();
    }

    public async create(patch: PatchItem): Promise<void> {
        logger.debug(`agentbasedPatch.service: create: in: patch: ${patch}`);

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch.patchTemplateName, 'Patch Template Name', ow.string.nonEmpty);
        ow(patch.patchStatus, 'Patch Status', ow.string.nonEmpty);
        ow(patch.patchType, 'Patch Type', ow.string.nonEmpty);
        ow(patch.deviceId, 'Patch Device Id', ow.string.nonEmpty);

        const sqsRequest: AWS.SQS.SendMessageRequest = {
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(patch)
        };

        try {
            await this.sqs.sendMessage(sqsRequest).promise();
        } catch (err) {
            logger.error(`agentbasedPatch.service sqs.sendMessage: in: ${sqsRequest} : error: ${JSON.stringify(err)}`);
            throw err;
        }

        logger.debug(`agentbasedPatch.service: create: exit`);

    }

    public async deploy(patch: PatchItem): Promise<void> {
        logger.debug(`agentbasedPatchService: deploy: in: patch: ${JSON.stringify(patch)}`);

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch.patchTemplateName, 'Patch Template Name', ow.string.nonEmpty);
        ow(patch.patchStatus, 'Patch Status', ow.string.nonEmpty);
        ow(patch.patchType, 'Patch Type', ow.string.nonEmpty);
        ow(patch.deviceId, 'Patch Device Id', ow.string.nonEmpty);

        const template = await this.templatesService.get(patch.patchTemplateName);

        if (!template) {
            throw new Error('TEMPLATE_NOT_FOUND');
        }

        const activation = await this.activationDao.getByDeviceId(patch.deviceId);

        if (!activation) {
            throw new Error('DEVICE_ACTIVATION_NOT_FOUND');
        }

        const instanceId = await this.getInstanceByActivationId(activation.activationId);

        if (!instanceId) {
            throw new Error('TARGET_INSTANCE_NOT_FOUND');
        }


        let association;
        try {
            const extraVars = {
                ...template?.extraVars,
                ...patch.extraVars
            }

            await this.transformExtraVars(extraVars);

            const playbook = await this.getAssociationSourceParameter(template.playbookSource);

            const associationParams: AWS.SSM.CreateAssociationRequest = {
                Name: this.ssmAnsiblePatchDocument,
                AssociationName: `${patch.patchId}`,
                Parameters: {
                    SourceType: ['S3'],
                    SourceInfo: [playbook],
                    InstallDependencies: ['False'],
                    ExtraVariables: this.convertExtraVarsToString(extraVars),
                    PlaybookFile: [`${template.name}___${template.playbookName}`]
                },
                OutputLocation: {
                    'S3Location': {
                        'OutputS3BucketName': this.artifactsBucket,
                        'OutputS3KeyPrefix': `${this.artifactsBucketPrefix}logs/`
                    }
                },
                ComplianceSeverity: 'UNSPECIFIED',
                Targets: [
                    {
                        Values: [instanceId],
                        Key: 'InstanceIds'
                    }
                ]
            };
            association = await this.ssm.createAssociation(associationParams).promise();
        } catch (err) {
            logger.error(`ssm.createAssociation: error: ${JSON.stringify(err)}`);
            throw err;
        }

        const patchAssociation: AssociationModel = {
            patchId: patch.patchId,
            associationId: association.AssociationDescription.AssociationId
        };

        await this.agentbasedPatchDao.save(patchAssociation);

        logger.debug(`agentbasedPatchService: deploy: out: result: ${JSON.stringify(association)}`);
    }

    public async delete(patch: PatchItem): Promise<void> {
        logger.debug(`agentbasedPatchService: delete: in: patch: ${patch}`);

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch.patchTemplateName, 'Patch Template Name', ow.string.nonEmpty);
        ow(patch.patchStatus, 'Patch Status', ow.string.nonEmpty);
        ow(patch.patchType, 'Patch Type', ow.string.nonEmpty);
        ow(patch.deviceId, 'Patch Device Id', ow.string.nonEmpty);

        const association = await this.agentbasedPatchDao.getByPatchId(patch.patchId);

        if (!association) {
            return;
        }

        const params: AWS.SSM.DeleteAssociationRequest = {
            AssociationId: association.associationId
        };

        let result;
        try {
            result = this.ssm.deleteAssociation(params).promise();
        } catch (err) {
            logger.error(`agentbasedPatch.service ssm.deleteAssociation err: ${err}`);
            throw err;
        }

        await this.agentbasedPatchDao.delete(association);

        logger.debug(`agentbasedPatchService: delete: out: result: ${JSON.stringify(result)}`);
    }

    public async update(patch: PatchItem): Promise<void> {
        logger.debug(`agentbasedPatchService: update in: patch: ${patch}`)

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch.patchTemplateName, 'Patch Template Name', ow.string.nonEmpty);
        ow(patch.patchStatus, 'Patch Status', ow.string.nonEmpty);
        ow(patch.patchType, 'Patch Type', ow.string.nonEmpty);
        ow(patch.deviceId, 'Patch Device Id', ow.string.nonEmpty);

        const template = await this.templatesService.get(patch.patchTemplateName);

        if (!template) {
            throw new Error('TEMPLATE_NOT_FOUND');
        }
        // get the association Id by doing a list
        const association = await this.agentbasedPatchDao.getByPatchId(patch.patchId);

        // if the association is not found, then create a new one by deploying
        if (!association) {
            return await this.deploy(patch);
        }

        ow(association.associationId, 'Association Id', ow.string.nonEmpty);

        // If an association is found, then update the association
        try {

            const playbook = await this.getAssociationSourceParameter(template.playbookSource);

            const extraVars = {
                ...template?.extraVars,
                ...patch.extraVars
            }

            await this.transformExtraVars(extraVars)

            const associationUpdateParams: AWS.SSM.UpdateAssociationRequest = {
                Name: this.ssmAnsiblePatchDocument,
                AssociationName: `${patch.patchId}`,
                AssociationId: association.associationId,
                Parameters: {
                    InstallDependencies: ['False'],
                    SourceType: ['S3'],
                    SourceInfo: [playbook],
                    ExtraVariables: this.convertExtraVarsToString(extraVars),
                    PlaybookFile: [`${template.name}___${template.playbookName}`]
                },
                OutputLocation: {
                    'S3Location': {
                        'OutputS3BucketName': this.artifactsBucket,
                        'OutputS3KeyPrefix': `${this.artifactsBucketPrefix}logs/`
                    }
                }
            };
            await this.ssm.updateAssociation(associationUpdateParams).promise();
        } catch (err) {
            logger.error(`ssm.updateAssociation: in: error: ${JSON.stringify(err)}`);
            throw err;
        }
    }

    private async getInstanceByActivationId(activationId: string) {
        logger.debug(`agentbasedPatchService: getInstanceByActivationId: in: activation: ${activationId}`);

        ow(activationId, 'Activation Id', ow.string.nonEmpty);

        const params: DescribeInstanceInformationRequest = {
            Filters: [{
                Key: 'ActivationIds',
                Values: [activationId]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch (err) {
            logger.error(`agentbasedPatch.service ssm.describeInstanceInformation err: ${err}`);
            throw err;
        }

        if (!result || result.InstanceInformationList.length === 0) {
            throw new Error('TARGET_INSTANCE_NOT_FOUND')
        }


        logger.debug(`agentbasedPatchService: getInstanceByActivationId: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0].InstanceId;
    }

    public async getInstance(instanceId: string): Promise<AWS.SSM.InstanceInformation> {
        logger.debug(`agentbasedPatchService: getInstance in: instanceId: ${instanceId}`);

        ow(instanceId, 'Instance Id', ow.string.nonEmpty);

        const params = {
            InstanceInformationFilterList: [{
                key: 'InstanceIds',
                valueSet: [instanceId]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch (err) {
            logger.error(`agentbasedPatch.service ssm.describeInstanceInformation err: ${err}`);
            throw err;
        }

        if(!result.InstanceInformationList || result.InstanceInformationList.length === 0) {
            throw new Error("TARGET_INSTANCE_NOT_FOUND")
        }

        logger.debug(`agentbasedPatchService: getInstance: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0];
    }

    public async getPatchByAssociationId(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedPatchDao: getPatchByAssociationId in: associationId: ${associationId}`);

        ow(associationId, 'Association Id', ow.string.nonEmpty);

        let result;
        try {
            result = await this.agentbasedPatchDao.getByAssociationId(associationId);
        } catch (err) {
            logger.error(`agentbasedPatch.service agentbasedPatchDao.get err: ${err}`);
            throw err;
        }

        logger.debug(`agentbasedPatchService: getPatchByInstanceId: exit: association: ${JSON.stringify(result)}`);

        return result;

    }

    private getAssociationSourceParameter(source: PatchSource): string {
        logger.debug(`agentbasedPatch.service getS3Path: in source: ${JSON.stringify(source)}`);

        ow(source, 'Source Information', ow.object.nonEmpty);
        ow(source.bucket, 'Bucket', ow.string.nonEmpty);
        ow(source.key, 'key', ow.string.nonEmpty);

        const associationS3Param = {
            path: `https://s3.amazonaws.com/${source.bucket}/${source.key}`,
        };

        logger.debug(`agentbasedPatch.service getS3Path: exit: out: path : ${associationS3Param}`);

        return JSON.stringify(associationS3Param);
    }

    private convertExtraVarsToString(extraVars: { [key: string]: string }): [string] {
        const vars: string[] = [];
        Object.keys(extraVars).forEach(key => {
            vars.push(`${key}=${extraVars[key]}`)
        });
        return [vars.length > 0 ? vars.join(" ") : ""];
    }

    /*
    This Function analysis extraVars object and evaluates any expressions, if an expression is evaled
    it will transform the property to be evaled expression
     */
    private async transformExtraVars(extraVars: { [key: string]: string }): Promise<{ [key: string]: string }> {
        const vars = Object.keys(extraVars);

        for (const v of vars) {
            extraVars[v] = Buffer.from(await this.expressionParser.eval(extraVars[v])).toString('base64');
        }

        return extraVars
    }
}
