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
import {logger} from './utils/logger';

import { TYPES } from './di/types';
import { container } from './di/inversify.config';

import { ActivationService } from './activation/activation.service';
import { ActivationItem } from './activation/activation.model';

import { DeploymentService } from './deployment/deployment.service';
import { DeploymentModel } from './deployment/deployment.model';

import { AgentbasedDeploymentService } from './deployment/agentbased-deployment.service';

const deploymentService: DeploymentService = container.get<DeploymentService>(TYPES.DeploymentService);
const activationService: ActivationService = container.get<ActivationService>(TYPES.DeploymentService);

const agentbasedDeploymentService: AgentbasedDeploymentService = container.get<AgentbasedDeploymentService>(TYPES.AgentbasedDeploymentService);

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async(event: any, context: any, callback: any) => {

    logger.debug(`event: ${JSON.stringify(event)}`);
    logger.debug(`context: ${JSON.stringify(context)}`);

    if(event.Records) {
        for (const record of event.Records) {
            if (record.eventSource === 'aws:sqs') {

                const eventBody = JSON.parse(record.body);

                if (eventBody['source']==='aws.ssm') {

                    if(
                        eventBody['detail-type'] ==='AWS API Call via CloudTrail' &&
                        eventBody.detail['eventName'] === 'UpdateInstanceAssociationStatus'
                    ) {

                        const activation: ActivationItem = {
                            activationId: eventBody.detail.requestParameters.associationId,
                            instanceId: eventBody.detail.requestParameters.associationId
                        };

                        await activationService.updateActivation(activation);

                    } else if (
                        eventBody['detail-type'] ==='EC2 State Manager Instance Association State Change' &&
                        eventBody.detail['document-name'] === 'AWS-RunAnsiblePlaybook'
                    ) {

                        logger.debug(`lambda_sqs_ssm_proxy: ssm_event: EC2 State Manager Instance Association State Change`);
                        logger.debug(`lambda_sqs_ssm_proxy: ssm_event_body: ${JSON.stringify(eventBody)}`);

                        const instanceId = eventBody.detail['instance-id'];
                        const deploymentStatus = eventBody.detail['status'].toLowerCase();
                        const associationId = eventBody.detail['association-id'];

                        const instanceInformation = await agentbasedDeploymentService.getInstance(instanceId);
                        const association = await agentbasedDeploymentService.getDeploymentByAssociationId(associationId);

                        const deviceId = instanceInformation.Name;
                        const deploymentId = association.deploymentId;

                        const deployment:DeploymentModel = {
                            deviceId,
                            deploymentId,
                            deploymentStatus
                        };

                        await deploymentService.update(deployment);

                    } else if (
                        eventBody['detail-type'] ==='EC2 State Manager Association State Change' &&
                        eventBody.detail['document-name'] === 'AWS-RunAnsiblePlaybook'
                    ) {

                        logger.debug(`lambda_sqs_ssm_proxy: ssm_event: EC2 State Manager Association State Change`);
                        logger.debug(`lambda_sqs_ssm_proxy: ssm_event_body: ${JSON.stringify(eventBody)}`);

                    } else {
                        logger.warn(`lambda_sqs_ssm_proxy handler: unrecognizable ssm event: ${JSON.stringify(record)}`);
                    }
                }

            } else {
                logger.warn(`lambda_sqs_ssm_proxy handler: ignoring non-sqs events: ${JSON.stringify(record)}`);
            }

        }

        callback(null, null);
    }
    logger.debug(`lambda_sqs_proxy handler: exit:`);
};
