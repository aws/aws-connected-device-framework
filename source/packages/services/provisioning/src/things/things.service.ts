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
import { logger } from '@awssolutions/simple-cdf-logger';
import { AWSError, Iot } from 'aws-sdk';
import {
    DescribeThingGroupResponse,
    DescribeThingRegistrationTaskRequest,
    GetPolicyResponse,
    RegisterThingRequest,
    StartThingRegistrationTaskRequest,
    StartThingRegistrationTaskResponse,
} from 'aws-sdk/clients/iot';
import { GetObjectOutput, GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { PromiseResult } from 'aws-sdk/lib/request';
import { inject, injectable } from 'inversify';
import clone from 'just-clone';
import { v1 as uuid } from 'uuid';
import { TYPES } from '../di/types';
import { AttachAdditionalPoliciesProcessor } from './steps/attachAdditionalPoliciesProcessor';
import { ClientIdEnforcementPolicyStepProcessor } from './steps/clientIdEnforcementPolicyStepProcessor';
import { CreateAwsCertiticateProcessor } from './steps/createAwsCertificateProcessor';
import { CreateDeviceCertificateStepProcessor } from './steps/createDeviceCertificateProcessor';
import { ProvisioningStepData } from './steps/provisioningStep.model';
import { RegisterDeviceCertificateWithoutCAStepProcessor } from './steps/registerDeviceCertificateWithoutCaProcessor';
import { UseACMPCAStepProcessor } from './steps/useACMPCAProcessor';
import { CDFProvisioningTemplate } from './templates/template.models';
import {
    BulkProvisionThingsResponse,
    CdfProvisioningParameters,
    CertificateStatus,
    ProvisionThingResponse,
    ThingCertificateModel,
    ThingDetailModel,
    ThingGroupModel,
    ThingPolicyModel,
} from './things.models';
import AWS = require('aws-sdk');

@injectable()
export class ThingsService {
    private _iot: AWS.Iot;
    private _s3: AWS.S3;

    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.ClientIdEnforcementPolicyStepProcessor)
        private clientIdEnforcementPolicyStepProcessor: ClientIdEnforcementPolicyStepProcessor,
        @inject(TYPES.CreateDeviceCertificateStepProcessor)
        private createDeviceCertificateStepProcessor: CreateDeviceCertificateStepProcessor,
        @inject(TYPES.CreateAwsCertiticateProcessor)
        private createAwsCertiticateProcessor: CreateAwsCertiticateProcessor,
        @inject(TYPES.RegisterDeviceCertificateWithoutCAStepProcessor)
        private registerDeviceCertificateWithoutCAStepProcessor: RegisterDeviceCertificateWithoutCAStepProcessor,
        @inject(TYPES.UseACMPCAStepProcessor)
        private useACMPAStepProcessor: UseACMPCAStepProcessor,
        @inject(TYPES.AttachAdditionalPoliciesProcessor)
        private attachAdditionalPoliciesProcessor: AttachAdditionalPoliciesProcessor,
        @inject('aws.s3.roleArn') private s3RoleArn: string,
        @inject('aws.s3.templates.bucket') private templateBucketName: string,
        @inject('aws.s3.templates.prefix') private templatePrefix: string,
        @inject('aws.s3.templates.suffix') private templateSuffix: string,
        @inject('aws.s3.bulkrequests.bucket') private bulkrequestsBucketName: string,
        @inject('aws.s3.bulkrequests.prefix') private bulkrequestsPrefix: string,
        @inject('features.delete.certificates') private deleteCertificates: boolean,
        @inject('features.delete.policies') private deletePolicies: boolean,
    ) {
        this._iot = iotFactory();
        this._s3 = s3Factory();
    }

    public async provision(
        provisioningTemplateId: string,
        parameters: { [key: string]: string },
        cdfProvisioningParameters: CdfProvisioningParameters,
    ): Promise<ProvisionThingResponse> {
        logger.debug(
            `things.service provision: in: provisioningTemplateId:${provisioningTemplateId}, parameters:${JSON.stringify(
                parameters,
            )}`,
        );

        // download the template
        const key = `${this.templatePrefix}${provisioningTemplateId}${this.templateSuffix}`;
        const s3Params: AWS.S3.GetObjectRequest = {
            Bucket: this.templateBucketName,
            Key: key,
        };

        let cdfTemplate: CDFProvisioningTemplate;
        try {
            logger.silly(`things.service provision: s3Params: ${JSON.stringify(s3Params)}`);
            const result = (await this._s3
                .getObject(s3Params)
                .promise()) as AWS.S3.GetObjectOutput;
            const templateBody = result.Body.toString();

            // lets strongly type the template body, so that we can determine the CDF specific pre/post steps (if any)
            cdfTemplate = JSON.parse(templateBody);
            logger.silly(`cdfTemplate: ${JSON.stringify(cdfTemplate)}`);
        } catch (err) {
            if (err.name === 'NoSuchKey') {
                throw new Error(`INVALID_PROVISIONING_TEMPLATE: ${provisioningTemplateId}`);
            } else {
                throw err;
            }
        }
        const { CDF, ...awsTemplate } = cdfTemplate;

        // ---- PRE PROCESS ----------------

        const stepData: ProvisioningStepData = {
            template: cdfTemplate,
            parameters,
            cdfProvisioningParameters,
            state: {},
        };

        // perform CDF pre-process steps before we apply the provisioning template
        await this.preProcessSteps(stepData);

        // ---- PROVISIONING ---------------

        // provision thing with AWS IoT
        const iotParams: RegisterThingRequest = {
            templateBody: JSON.stringify(awsTemplate),
            parameters: stepData.parameters,
        };

        try {
            const registered = (await this._iot
                .registerThing(iotParams)
                .promise()) as AWS.Iot.Types.RegisterThingResponse;
            if (stepData.state === undefined) {
                stepData.state = {};
            }
            if (stepData.state === undefined) {
                stepData.state = {};
            }
            stepData.state.arns = {
                policyLogicalName: registered.resourceArns['PolicyLogicalName'],
                certificate: registered.resourceArns['certificate'],
                thing: registered.resourceArns['thing'],
            };
            stepData.state.certificatePem = registered.certificatePem;
        } catch (err) {
            throw new Error('REGISTRATION_FAILED: ' + (<AWSError>err).message);
        }

        // ---- POST PROCESS ---------------

        // perform CDF post-process steps
        await this.postProcessSteps(stepData);

        // ---- FINISHED ---------------

        const response: ProvisionThingResponse = {
            certificatePem: stepData.state.certificatePem,
            privateKey: stepData.state.privateKey,
            resourceArns: {
                policyLogicalName: stepData.state.arns.policyLogicalName,
                certificate: stepData.state.arns.certificate,
                thing: stepData.state.arns.thing,
            },
        };

        // TODO: fire event

        const loggerResponse = { ...response, resourceArns: { ...response.resourceArns } };
        loggerResponse.privateKey = this.removeStringForLogging(loggerResponse.privateKey);
        logger.debug(`things.service provision: exit: response:${JSON.stringify(loggerResponse)}`);
        return response;
    }

    private async preProcessSteps(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(
            `things.service preProcessSteps: in: stepData:${JSON.stringify(
                this.redactStepData(stepData),
            )}`,
        );

        const cdfOptions = stepData.template.CDF;

        if (!cdfOptions) return;

        if (cdfOptions.createDeviceCertificate === true) {
            logger.debug(`things.service preProcessSteps: processing createDeviceCertificate`);
            await this.createDeviceCertificateStepProcessor.process(stepData);
        } else if (cdfOptions.createDeviceAWSCertificate === true) {
            logger.debug(`things.service preProcessSteps: processing createDeviceAWSCertificate`);
            await this.createAwsCertiticateProcessor.process(stepData);
        } else if (cdfOptions.registerDeviceCertificateWithoutCA === true) {
            logger.debug(
                `things.service preProcessSteps: processing registerDeviceCertificateWithoutCA`,
            );
            await this.registerDeviceCertificateWithoutCAStepProcessor.process(stepData);
        } else if (cdfOptions.acmpca?.mode) {
            logger.debug(`things.service preProcessSteps: processing useACMPCA`);
            await this.useACMPAStepProcessor.process(stepData);
        }

        logger.debug(
            `things.service preProcessSteps: exit: ${JSON.stringify(
                this.redactStepData(stepData),
            )}`,
        );
    }

    private async postProcessSteps(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(
            `things.service postProcessSteps: in: stepData:${JSON.stringify(
                this.redactStepData(stepData),
            )}`,
        );

        const cdfOptions = stepData.template.CDF;

        if (!cdfOptions) return;

        if (cdfOptions?.clientIdMustMatchThingName === true) {
            await this.clientIdEnforcementPolicyStepProcessor.process(stepData);
        }

        if ((stepData.template.CDF?.attachAdditionalPolicies?.length ?? 0) > 0) {
            await this.attachAdditionalPoliciesProcessor.process(stepData);
        }

        logger.debug(
            `things.service postProcessSteps: exit: ${JSON.stringify(
                this.redactStepData(stepData),
            )}`,
        );
    }

    private redactStepData(stepData: ProvisioningStepData): ProvisioningStepData {
        const redactedStepData = clone(stepData);
        if (stepData.state) {
            redactedStepData.state.privateKey = this.removeStringForLogging(
                stepData.state.privateKey,
            );
        }
        return redactedStepData;
    }

    public async bulkProvision(
        provisioningTemplateId: string,
        parameters: { [key: string]: string }[],
    ): Promise<BulkProvisionThingsResponse> {
        logger.debug(
            `things.service bulkProvision: in: provisioningTemplateId:${provisioningTemplateId}, parameters:${JSON.stringify(
                parameters,
            )}`,
        );

        // download the template
        const templateKey = `${this.templatePrefix}${provisioningTemplateId}${this.templateSuffix}`;
        const s3TemplateParams: GetObjectRequest = {
            Bucket: this.templateBucketName,
            Key: templateKey,
        };
        const result = (await this._s3.getObject(s3TemplateParams).promise()) as GetObjectOutput;
        const templateBody = result.Body.toString();

        // CDF extensions are not yet supported in the bulk registration flow
        const templateBodyAsJson = JSON.parse(templateBody);
        if (templateBodyAsJson.CDF) {
            throw new Error(
                'REGISTRATION_FAILED: CDF provisioning template extensions are not yet supported in the bulk registration flow.',
            );
        }

        // upload the parameters to S3 for processing (each thing's parameters needs
        // to be well-formed json on its own line)
        const data: string[] = [];
        parameters.forEach((p) => {
            data.push(JSON.stringify(p).replace('\t', '').replace('\n', ''));
        });
        const bulkrequestKey = `${this.bulkrequestsPrefix}${uuid()}`;
        const s3ThingsParam: PutObjectRequest = {
            Body: Buffer.from(data.join('\n'), 'binary'),
            Bucket: this.bulkrequestsBucketName,
            Key: bulkrequestKey,
        };
        await this._s3.putObject(s3ThingsParam).promise();

        // TODO: add in support for pre-process steps to bulk provisioning (no need for it yet)

        // provision things within AWS IoT
        const taskParams: StartThingRegistrationTaskRequest = {
            templateBody,
            inputFileBucket: this.bulkrequestsBucketName,
            inputFileKey: bulkrequestKey,
            roleArn: this.s3RoleArn,
        };

        let response: BulkProvisionThingsResponse;
        try {
            const task = (await this._iot
                .startThingRegistrationTask(taskParams)
                .promise()) as StartThingRegistrationTaskResponse;
            response = {
                taskId: task.taskId,
            };
        } catch (err) {
            throw new Error('REGISTRATION_FAILED: ' + (<AWSError>err).message);
        }

        // TODO: add in support for post-process steps to bulk provisioning (no need for it yet).  will need to wait for the task completing

        logger.debug(`things.service bulkProvision: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async getBulkProvisionTask(taskId: string): Promise<BulkProvisionThingsResponse> {
        logger.debug(`things.service getBulkProvisionTask: in: taskId:${taskId}`);

        const params: DescribeThingRegistrationTaskRequest = {
            taskId,
        };

        let response: BulkProvisionThingsResponse;
        try {
            const task = await this._iot.describeThingRegistrationTask(params).promise();
            response = {
                taskId,
                status: task.status,
                creationDate: task.creationDate,
                lastModifiedDate: task.lastModifiedDate,
                successCount: task.successCount,
                failureCount: task.failureCount,
                percentageProgress: task.percentageProgress,
            };
        } catch (err) {
            return undefined;
        }
        logger.debug(
            `things.service getBulkProvisionTask: exit: response:${JSON.stringify(response)}`,
        );
        return response;
    }

    public async getThing(thingName: string): Promise<ThingDetailModel> {
        logger.debug(`things.service getThing: in: thingName:${thingName}`);

        const describeThingFuture = this._iot.describeThing({ thingName }).promise();
        const listThingPrincipalsFuture = this._iot.listThingPrincipals({ thingName }).promise();
        const listThingGroupsForThingFuture = this._iot
            .listThingGroupsForThing({ thingName })
            .promise();
        const results = await Promise.all([
            describeThingFuture,
            listThingPrincipalsFuture,
            listThingGroupsForThingFuture,
        ]);

        let thing: AWS.Iot.DescribeThingResponse = {};
        try {
            thing = results[0];
        } catch (e) {
            throw new Error('NOT_FOUND');
        }

        const thingModel: ThingDetailModel = {
            thingName,
            arn: thing.thingArn,
            attributes: thing.attributes,
            certificates: [],
            policies: [],
            groups: [],
        };

        const foundPolicies: { [key: string]: boolean } = {};

        const thingPrincipals = results[1];

        if (thingPrincipals.principals.length > 0) {
            for (const certArn of thingPrincipals.principals) {
                const certificateId = certArn.split('/')[1];
                const describeCertificateFuture = this._iot
                    .describeCertificate({ certificateId })
                    .promise();
                const listPrincipalPoliciesFuture = this._iot
                    .listPrincipalPolicies({ principal: certArn })
                    .promise();
                const pricipalResults = await Promise.all([
                    describeCertificateFuture,
                    listPrincipalPoliciesFuture,
                ]);

                const describeCertificateResponse = pricipalResults[0];

                const certificateStatus: CertificateStatus =
                    describeCertificateResponse.certificateDescription.status === 'ACTIVE'
                        ? CertificateStatus.ACTIVE
                        : CertificateStatus.INACTIVE;

                const certDetails: ThingCertificateModel = {
                    certificateId:
                        describeCertificateResponse.certificateDescription.certificateId,
                    arn: describeCertificateResponse.certificateDescription.certificateArn,
                    certificateStatus,
                    certificatePem:
                        describeCertificateResponse.certificateDescription.certificatePem,
                };
                thingModel.certificates.push(certDetails);

                const attachedPolicies = pricipalResults[1];
                for (const policy of attachedPolicies.policies) {
                    foundPolicies[policy.policyName] = true;
                }
            }

            const policyFutures: Promise<PromiseResult<GetPolicyResponse, AWSError>>[] = [];
            for (const policyName of Object.keys(foundPolicies)) {
                policyFutures.push(this._iot.getPolicy({ policyName }).promise());
            }
            const policyResults = await Promise.all(policyFutures);
            for (const policyResult of policyResults) {
                const policyDetails: ThingPolicyModel = {
                    policyName: policyResult.policyName,
                    arn: policyResult.policyArn,
                    policyDocument: JSON.parse(policyResult.policyDocument),
                };
                thingModel.policies.push(policyDetails);
            }
        }

        // TODO: this returns immmediate groups and does not traverse the group hierarchy
        const thingGroups = results[2];
        const describeThingGroupFutures: Promise<
            PromiseResult<DescribeThingGroupResponse, AWSError>
        >[] = [];
        for (const group of thingGroups.thingGroups) {
            describeThingGroupFutures.push(
                this._iot.describeThingGroup({ thingGroupName: group.groupName }).promise(),
            );
        }
        const describeThingGroupResults = await Promise.all(describeThingGroupFutures);

        for (const describeThingGroupResult of describeThingGroupResults) {
            let groupAttributes: { [key: string]: string } = {};
            if (describeThingGroupResult.hasOwnProperty('thingGroupProperties')) {
                if (describeThingGroupResult.hasOwnProperty('attributePayload')) {
                    groupAttributes =
                        describeThingGroupResult.thingGroupProperties.attributePayload.attributes;
                }
            }

            const groupModel: ThingGroupModel = {
                groupName: describeThingGroupResult.thingGroupName,
                arn: describeThingGroupResult.thingGroupArn,
                attributes: groupAttributes,
            };
            thingModel.groups.push(groupModel);
        }

        logger.debug(`things.service getThing: exit: thingModel:${JSON.stringify(thingModel)}`);
        return thingModel;
    }

    /**
     *  Delete a thing from the AWS IoT Device Registry
     *
     *  - only delete a things associated certificates if the feature is enabled
     *      and the cert is not attached to another thing
     *  - only delete policies associated with this thing's certificates if the feature is enabled and
     *      the policy only targets certs attached to this thing
     */
    public async deleteThing(thingName: string): Promise<void> {
        logger.debug(`things.service deleteThing: in: thingName:${thingName}`);
        logger.debug(
            `feature flags: deleteCertificates: ${this.deleteCertificates}, deletePolicies: ${this.deletePolicies}`,
        );

        const thingPrincipals = await this._iot.listThingPrincipals({ thingName }).promise();

        if (thingPrincipals.principals.length > 0) {
            for (const principal of thingPrincipals.principals) {
                if (!this.deleteCertificates && !this.deletePolicies) {
                    // all to do in this case is detach the cert, then delete thing
                    await this._iot.detachThingPrincipal({ thingName, principal }).promise();
                } else {
                    const attachedPolicies = await this._iot
                        .listPrincipalPolicies({ principal })
                        .promise();
                    for (const policy of attachedPolicies.policies) {
                        // first detach the policy from the cert
                        await this._iot
                            .detachPrincipalPolicy({ principal, policyName: policy.policyName })
                            .promise();
                        if (this.deletePolicies) {
                            // fetch certificates targeted by this policy
                            const policyTargets = await this._iot
                                .listTargetsForPolicy({ policyName: policy.policyName })
                                .promise();
                            // if this policy no longer targets any certificates or
                            // if every cert targeted by this policy is a cert attached to this thing
                            const policyTargetsOnlyThisThingsCerts = policyTargets.targets.every(
                                (val) => thingPrincipals.principals.indexOf(val) >= 0,
                            );
                            if (
                                policyTargets.targets.length === 0 ||
                                policyTargetsOnlyThisThingsCerts
                            ) {
                                await this._iot
                                    .deletePolicy({ policyName: policy.policyName })
                                    .promise();
                            }
                        }
                    }
                    // now detach thing from cert
                    await this._iot.detachThingPrincipal({ principal, thingName }).promise();
                    if (this.deleteCertificates) {
                        // fetch things associated with this cert
                        const princpalThings = await this._iot
                            .listPrincipalThings({ principal })
                            .promise();
                        // delete cert if no longer attached to any things
                        if (princpalThings.things.length === 0) {
                            const certificateId = principal.split('/')[1];
                            await this._iot
                                .updateCertificate({ certificateId, newStatus: 'INACTIVE' })
                                .promise();
                            await this._iot.deleteCertificate({ certificateId }).promise();
                        }
                    }
                }
            }
        }

        await this._iot.deleteThing({ thingName }).promise();

        logger.debug('things.service deleteThing: exit:');
        return;
    }

    public async updateThingCertificatesStatus(
        thingName: string,
        newStatus: CertificateStatus,
    ): Promise<void> {
        logger.debug(
            `things.service updateThingCertificatesStatus: in: thingName:${thingName}, newStatus:${newStatus}`,
        );

        const thing = await this.getThing(thingName);

        if (thing.certificates) {
            for (const c of thing.certificates) {
                await this.updateCertificateStatus(c.certificateId, newStatus);
            }
        }

        logger.debug('things.service updateThingCertificatesStatus: exit');
    }

    public async updateCertificateStatus(
        certificateId: string,
        newStatus: CertificateStatus,
    ): Promise<void> {
        logger.debug(
            `things.service updateCertificateStatus: in: certificateId:${certificateId}, newStatus:${newStatus}`,
        );

        const params: Iot.Types.UpdateCertificateRequest = {
            certificateId,
            newStatus,
        };
        await this._iot.updateCertificate(params).promise();

        logger.debug('things.service updateCertificateStatus: exit:');
    }

    private removeStringForLogging(stringIn: string): string {
        if (stringIn !== undefined && stringIn !== null) {
            return 'STRING REMOVED FROM LOG MESSSAGE';
        } else {
            return stringIn;
        }
    }
}
