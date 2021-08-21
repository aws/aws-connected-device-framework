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
import config from 'config';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { AssociationModel, DeploymentModel, DeploymentSource } from './deployment.model';
import { ActivationDao } from '../activation/activation.dao';
import { AgentbasedDeploymentDao } from './agentbased-deployment.dao';


@injectable()
export class AgentbasedDeploymentService {

    private readonly ssm: AWS.SSM;
    private readonly sqs: AWS.SQS;
    private readonly s3: AWS.S3;

    constructor(
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject('aws.s3.deploymentLogs.bucket') private deploymentLogsBucket: string,
        @inject('aws.s3.deploymentLogs.prefix') private deploymentLogsPrefix: string,
        @inject(TYPES.ActivationDao) private activationDao: ActivationDao,
        @inject(TYPES.AgentbasedDeploymentDao) private agentbasedDeploymentDao: AgentbasedDeploymentDao
    ) {
        this.ssm = ssmFactory();
        this.sqs = sqsFactory();
        this.s3 = s3Factory();
    }

    public async create(deployment: DeploymentModel): Promise<void> {
        logger.debug(`agentbasedDeployment.service: create: in: deployment: ${deployment}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deploymentTemplateName, 'Deployment Template Name', ow.string.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);
        ow(deployment.deploymentType, 'Deployment Type', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Deployment Device Id', ow.string.nonEmpty);

        const activation = await this.activationDao.getByDeviceId(deployment.deviceId);

        if(!activation) {
            throw new Error('DEVICE_NOT_ACTIVATED_AS_HYBRID_INSTANCE');
        }

        const instanceId = await this.getInstanceByActivationId(activation.activationId);

        if (!instanceId) {
            throw new Error('DEVICE_NOT_ACTIVATED_AS_HYBRID_INSTANCE');
        }

        const queueUrl:string = config.get('aws.sqs.agentbasedDeploymentQueue');

        const sqsRequest: AWS.SQS.SendMessageRequest = {
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(deployment)
        };

        try {
            await this.sqs.sendMessage(sqsRequest).promise();
        } catch (err) {
            logger.error(`agentbasedDeployment.service sqs.sendMessage: in: ${sqsRequest} : error: ${JSON.stringify(err)}`);
            throw err;
        }

        logger.debug(`agentbasedDeployment.service: create: exit`);

    }

    public async deploy(deployment: DeploymentModel): Promise<void> {
        logger.debug(`agentbasedDeploymentService: deploy: in: deployment: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deploymentTemplateName, 'Deployment Template Name', ow.string.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);
        ow(deployment.deploymentType, 'Deployment Type', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Deployment Device Id', ow.string.nonEmpty);

        const activation = await this.activationDao.getByDeviceId(deployment.deviceId);

        if(!activation) {
            throw new Error('DEVICE_ACTIVATION_NOT_FOUND');
        }

        const instanceId = await this.getInstanceByActivationId(activation.activationId);

        if (!instanceId) {
            throw new Error('TARGET_INSTANCE_NOT_FOUND');
        }

        const playbookUrl = await this.getS3SignedURL(deployment.deploymentTemplate.source);

        const associationParams: AWS.SSM.CreateAssociationRequest = {
            Name: 'AWS-RunAnsiblePlaybook',
            AssociationName: `${deployment.deploymentId}`,
            Parameters: {
                playbook: [''],
                playbookurl: [ playbookUrl ],
                extravars: [''],
                check: ['False']
            },
            OutputLocation: {
                'S3Location': {
                    'OutputS3BucketName': this.deploymentLogsBucket,
                    'OutputS3KeyPrefix': this.deploymentLogsPrefix
                }
            },
            ComplianceSeverity: 'UNSPECIFIED',
            Targets: [
                {
                    Values: [ instanceId ],
                    Key: 'InstanceIds'
                }
            ]
        };

        if(deployment.deploymentTemplate.envVars) {
            associationParams.Parameters.extravars = deployment.deploymentTemplate.envVars;
        }

        let association;
        try {
            association = await this.ssm.createAssociation(associationParams).promise();
        } catch (err) {
            logger.error(`ssm.createAssociation: in: ${associationParams} : error: ${JSON.stringify(err)}`);
            throw err;
        }

        const deploymentAssociation:AssociationModel = {
            deploymentId: deployment.deploymentId,
            associationId: association.AssociationDescription.AssociationId
        };

        await this.agentbasedDeploymentDao.save(deploymentAssociation);

        logger.debug(`agentbasedDeploymentService: deploy: out: result: ${JSON.stringify(association)}`);
    }

    public async delete(deployment: DeploymentModel): Promise<void> {
        logger.debug(`agentbasedDeploymentService: delete: in: deployment: ${deployment}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deploymentTemplateName, 'Deployment Template Name', ow.string.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);
        ow(deployment.deploymentType, 'Deployment Type', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Deployment Device Id', ow.string.nonEmpty);

        const association = await this.agentbasedDeploymentDao.getByDeploymentId(deployment.deploymentId);

        if(!association) {
            return null;
        }

        const params: AWS.SSM.DeleteAssociationRequest = {
            AssociationId: association.associationId
        };

        let result;
        try {
            result = this.ssm.deleteAssociation(params).promise();
        } catch (err) {
            logger.error(`agentbasedDeployment.service ssm.deleteAssociation err: ${err}`);
            throw err;
        }

        await this.agentbasedDeploymentDao.delete(association);

        logger.debug(`agentbasedDeploymentService: delete: out: result: ${JSON.stringify(result)}`);
    }


    public async update(deployment: DeploymentModel): Promise<void> {
        logger.debug(`agentbasedDeploymentService: update in: deployment: ${deployment}`)

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deploymentTemplateName, 'Deployment Template Name', ow.string.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);
        ow(deployment.deploymentType, 'Deployment Type', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Deployment Device Id', ow.string.nonEmpty);
        ow(deployment.deploymentTemplate.source, 'Deployment Template source', ow.object.nonEmpty);

        // get the association Id by doing a list
        const association = await this.agentbasedDeploymentDao.getByDeploymentId(deployment.deploymentId);

        if (!association) {
            throw new Error('ASSOCIATION_NOT_FOUND');
        }

        ow(association.associationId, 'Association Id', ow.string.nonEmpty);

        const playbookUrl = await this.getS3SignedURL(deployment.deploymentTemplate.source);

        const associationUpdateParams: AWS.SSM.UpdateAssociationRequest = {
            Name: 'AWS-RunAnsiblePlaybook',
            AssociationName: `${deployment.deploymentId}`,
            AssociationId: association.associationId,
            Parameters: {
                playbook: [''],
                playbookurl: [ playbookUrl ],
                extravars: [''],
                check: ['False']
            },
            OutputLocation: {
                'S3Location': {
                    'OutputS3BucketName': this.deploymentLogsBucket,
                    'OutputS3KeyPrefix': this.deploymentLogsPrefix
                }
            }
        };


        try {
            await this.ssm.updateAssociation(associationUpdateParams).promise();
        } catch (err) {
            logger.error(`ssm.updateAssociation: in: ${associationUpdateParams} : error: ${JSON.stringify(err)}`);
            throw err;
        }


        const params: AWS.SSM.StartAssociationsOnceRequest = {
            AssociationIds: [association.associationId]
        }

        let result;
        try {
            result = this.ssm.startAssociationsOnce(params).promise();
        } catch (err) {
            logger.error(`agentbasedDeployment.service ssm.startAssociationOnce err: ${err}`);
            throw err;
        }

        logger.debug(`agentbasedDeploymentService: update out: result: ${result}`)
    }

    private async getInstanceByActivationId(activationId: string) {
        logger.debug(`agentbasedDeploymentService: getInstanceByActivationId: in: activation: ${activationId}`);

        ow(activationId, 'Activation Id', ow.string.nonEmpty);

        const params = {
            InstanceInformationFilterList: [{
                key: 'ActivationIds',
                valueSet: [ activationId ]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch(err) {
            logger.error(`agentbasedDeployment.service ssm.describeInstanceInformation err: ${err}`);
            throw err;
        }

        if (!result || result.InstanceInformationList.length === 0) {
            throw new Error('TARGET_INSTANCE_NOT_FOUND')
        }


        logger.debug(`agentbasedDeploymentService: getInstanceByActivationId: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0].InstanceId;
    }

    public async getInstance(instanceId: string): Promise<AWS.SSM.InstanceInformation> {
        logger.debug(`agentbasedDeploymentService: getInstance in: instanceId: ${instanceId}`);

        ow(instanceId, 'Instance Id', ow.string.nonEmpty);

        const params = {
            InstanceInformationFilterList: [{
                key: 'InstanceIds',
                valueSet: [ instanceId ]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch(err) {
            logger.error(`agentbasedDeployment.service ssm.describeInstanceInformation err: ${err}`);
            throw err;
        }

        logger.debug(`agentbasedDeploymentService: getInstance: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0];
    }

    public async getDeploymentByAssociationId(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedDeploymentDao: getDeploymentByAssociationId in: associationId: ${associationId}`);

        ow(associationId, 'Association Id', ow.string.nonEmpty);

        let result;
        try {
            result = await this.agentbasedDeploymentDao.get(associationId);
        } catch (err) {
            logger.error(`agentbasedDeployment.service agentbasedDeploymentDao.get err: ${err}`);
            throw err;
        }

        logger.debug(`agentbasedDeploymentService: getDeploymentByInstanceId: exit: association: ${JSON.stringify(result)}`);

        return result;

    }

    private async getS3SignedURL(source: DeploymentSource) {
        logger.debug(`agentbasedDeployment.service getS3SignedURL: in source: ${JSON.stringify(source)}`);

        ow(source, 'Source Information', ow.object.nonEmpty);
        ow(source.bucket, 'Bucket', ow.string.nonEmpty);
        ow(source.prefix, 'Prefix', ow.string.nonEmpty);

        const params = { Bucket: source.bucket, Key: source.prefix };
        const url = await this.s3.getSignedUrl('getObject', params);

        logger.debug(`gentbasedDeployment.service getS3SignedURL: exit: out: url: ${url}`);

        return url;
    }
}
