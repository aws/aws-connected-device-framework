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
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';

import {
    ComponentDeploymentSpecification, CreateDeploymentCommand, GetCoreDeviceCommand,
    GreengrassV2Client
} from '@aws-sdk/client-greengrassv2';
import {
    AddThingToThingGroupCommand, CreateThingGroupCommand, DescribeThingGroupCommand, IoTClient, TagResourceCommand
} from '@aws-sdk/client-iot';

import { CoresService } from '../cores/cores.service';
import { DeploymentTasksDao } from '../deploymentTasks/deploymentTasks.dao';
import { TYPES } from '../di/types';
import { TemplateItem } from '../templates/templates.models';
import { TemplatesService } from '../templates/templates.service';
import { logger } from '../utils/logger.util';
import { Deployment, DeploymentTaskCreatedEvent, DeploymentTaskCreatedPayload, NewDeployment } from './deployments.models';
import { CDFEventPublisher, EVENT_PUBLISHER_TYPES } from "@cdf/event-publisher";

export const DEPLOYMENT_TASK_ID_TAG_KEY = 'cdf-greengrass2-provisioning-deployment-task-id'

@injectable()
export class DeploymentsService {

    private ggv2: GreengrassV2Client;
    private iot: IoTClient;

    public constructor(
        @inject(TYPES.DeploymentTasksDao) private deploymentTasksDao: DeploymentTasksDao,
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.CoresService) private coresService: CoresService,
        @inject(TYPES.IotFactory) iotFactory: () => IoTClient,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client,
        @inject(EVENT_PUBLISHER_TYPES.CDFEventPublisher) private cdfEventPublisher: CDFEventPublisher,) {
        this.iot = iotFactory();
        this.ggv2 = ggv2Factory();
    }

    public async createDeployments(taskId: string, deployments: NewDeployment[]): Promise<Deployment[]> {
        logger.debug(`deployments.service createDeployments: in: taskId:${taskId}, deployments: ${JSON.stringify(deployments)}`);

        // fail fast if invalid request
        ow(deployments, ow.array.minLength(1));

        const futures: Promise<Deployment>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const d of deployments) {
            futures.push(
                limit(async () => {
                    let processed: Deployment;
                    try {
                        processed = await this.createDeployment(taskId, d);
                    } catch (e) {
                        logger.error(`deployments.service createDeployments: error: ${e.name}: ${e.message}`);
                        processed = {
                            ...d,
                            taskStatus: 'Failure',
                            statusMessage: e.message,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                    return processed;
                })
            );
        }

        const results = await Promise.all(futures);
        logger.debug(`deployments.service createDeployments: exit: ${JSON.stringify(results)}`);
        return results;
    }

    public async createDeployment(taskId: string, request: NewDeployment): Promise<Deployment> {
        logger.debug(`deployments.service createDeployment: in: taskId:${taskId}, request:${JSON.stringify(request)}`);

        // fail fast if invalid request
        ow(taskId, ow.string.nonEmpty);
        ow(request?.coreName, 'core name', ow.string.nonEmpty);

        // get the task to determine the template
        const task = await this.deploymentTasksDao.get(taskId);
        ow(task, 'deployment task', ow.object.nonEmpty);
        ow(task.template.name, 'template name', ow.string.nonEmpty);
        ow(task.template.version, 'template version', ow.number.greaterThan(0));

        // set deployment as in progress
        const deployment: Deployment = {
            ...request,
            taskStatus: 'InProgress',
            createdAt: new Date(),
            updatedAt: new Date()
        }

        // and save the desired template info
        const futures: Promise<void>[] = [
            this.deploymentTasksDao.saveTaskDetail(taskId, deployment),
            this.coresService.associateTemplate(deployment.coreName, task.template.name, task.template.version as number, 'desired')
        ];
        await Promise.all(futures);

        // determine if core is already registered with ggv2
        try {
            await this.ggv2.send(new GetCoreDeviceCommand({ coreDeviceThingName: deployment.coreName }));
        } catch (e) {
            logger.error(`deployments.service createDeployment: error: ${JSON.stringify(e)}`);
            if (e.name === 'ResourceNotFoundException') {
                this.markAsFailed(deployment, 'Core device not registered with Greengrass V2');
            } else {
                this.markAsFailed(deployment, `Unable to determine if core device is registered with Greengrass V2: ${e.name}`);
            }
        }

        // retrieve template/version
        let template: TemplateItem;
        if (this.isStillInProgress(deployment)) {
            template = await this.templatesService.get(task.template.name, task.template.version);
            if (template === undefined) {
                this.markAsFailed(deployment, 'Template not found');
            }
        }

        // determine if a deployment already exists for the template. if not, create it (and save to db)
        if (this.isStillInProgress(deployment)) {
            if (template.deployment?.id === undefined) {
                // deployment does not exist therefore create it
                // first create the thing group target
                const thingGroupName = this.getTemplateVersionThingGroupTarget(template);
                let thingGroupArn: string;
                try {
                    const r = await this.iot.send(new CreateThingGroupCommand({
                        thingGroupName,
                        tags: [{
                            Key: DEPLOYMENT_TASK_ID_TAG_KEY,
                            Value: taskId
                        }]
                    }));
                    logger.silly(`deployments.service createDeployment: CreateThingGroupCommandOutput: ${JSON.stringify(r)}`);
                    thingGroupArn = r.thingGroupArn;
                } catch (e) {
                    logger.error(`deployments.service createDeployment: error: ${JSON.stringify(e)}`);
                    if (e.name === 'ResourceAlreadyExistsException') {
                        logger.warn(`deployments.service createDeployment: thingGroup: ${thingGroupName} already exists`);
                        const r = await this.iot.send(new DescribeThingGroupCommand({ thingGroupName }));
                        logger.silly(`deployments.service createDeployment: DescribeThingGroupCommandOutput: ${JSON.stringify(r)}`);
                        thingGroupArn = r.thingGroupArn;
                    } else {
                        this.markAsFailed(deployment, `Unable to create thing group: ${e.name}`);
                    }
                }

                // now we can create the deployment
                if (this.isStillInProgress(deployment)) {
                    try {
                        const componentsMap: { [key: string]: ComponentDeploymentSpecification } = {};
                        template.components?.forEach(c => componentsMap[c.key] = {
                            componentVersion: c.version,
                            configurationUpdate: c.configurationUpdate,
                            runWith: c.runWith
                        });
                        const r = await this.ggv2.send(new CreateDeploymentCommand({
                            targetArn: thingGroupArn,
                            deploymentName: `CDF GreengrassV2 Provisoning - Template: ${template.name}, Version: ${template.version}`,
                            components: componentsMap,
                            iotJobConfiguration: template.jobConfig,
                            deploymentPolicies: template.deploymentPolicies,
                            tags: {
                                DEPLOYMENT_TASK_ID_TAGGING_KEY: taskId
                            }
                        }));
                        logger.silly(`deployments.service createDeployment: CreateDeploymentCommandOutput: ${JSON.stringify(r)}`);

                        template.deployment = {
                            id: r.deploymentId,
                            thingGroupName,
                            jobId: r.iotJobId
                        }

                        const tagResourceOutput = await this.iot.send(new TagResourceCommand({
                            resourceArn: r.iotJobArn,
                            tags: [{
                                Key: DEPLOYMENT_TASK_ID_TAG_KEY, Value: taskId
                            }]
                        }))

                        logger.silly(`deployments.service createDeployment: TagResourceCommandOutput: ${JSON.stringify(tagResourceOutput)}`);

                    } catch (e) {
                        logger.error(`deployments.service createDeployment: error: ${JSON.stringify(e)}`);
                        this.markAsFailed(deployment, `Failed to create deployment: ${e.name}`);
                    }
                }

                // and save the state
                if (this.isStillInProgress(deployment)) {
                    try {
                        await this.templatesService.associateDeployment(template)
                    } catch (e) {
                        logger.error(`deployments.service createDeployment: error: ${JSON.stringify(e)}`);
                        this.markAsFailed(deployment, `Failed to associate deployment with template: ${e.name}`);
                    }
                }
            }
        }

        // add thing to thing group
        if (this.isStillInProgress(deployment)) {
            try {
                await this.iot.send(new AddThingToThingGroupCommand({
                    thingName: deployment.coreName,
                    thingGroupName: template.deployment.thingGroupName
                }));
            } catch (e) {
                logger.error(`deployments.service createDeployment: error: ${JSON.stringify(e)}`);
                this.markAsFailed(deployment, `Failed to add core device to deployment thing group target: ${e.name}`);
            }
        }

        // save
        if (deployment.taskStatus === 'InProgress') {
            deployment.taskStatus = 'Success';
            deployment.updatedAt = new Date();
            await this.cdfEventPublisher.emitEvent<DeploymentTaskCreatedPayload>({
                name: DeploymentTaskCreatedEvent,
                payload: {
                    taskId: taskId,
                    coreName: deployment.coreName,
                    status: 'success',
                }
            })
        }


        if (deployment.taskStatus === 'Failure') {
            await this.cdfEventPublisher.emitEvent<DeploymentTaskCreatedPayload>({
                name: DeploymentTaskCreatedEvent,
                payload: {
                    taskId: taskId,
                    coreName: deployment.coreName,
                    status: 'failed',
                    message: deployment.statusMessage
                }
            })
        }

        await this.deploymentTasksDao.saveTaskDetail(taskId, deployment);



        logger.debug(`deployments.service createDeployment: exit: ${JSON.stringify(deployment)}`);
        return deployment;

    }

    private markAsFailed(deployment: Deployment, statusMessage: string): void {
        logger.debug(`deployments.service markAsFailed: statusMessage: ${statusMessage}`);
        deployment.taskStatus = 'Failure';
        deployment.statusMessage = statusMessage;
        deployment.updatedAt = new Date();
    }

    private getTemplateVersionThingGroupTarget(template: TemplateItem): string {
        return `cdf_ggv2_deploymentForTemplate_${template.name}_${template.version}`;
    }

    private isStillInProgress(deployment: Deployment): boolean {
        return deployment.taskStatus === 'InProgress';
    }

    public async getDeploymentIdByJobId(jobId: string): Promise<string> {
        logger.debug(`templates.service getDeploymentIdByJobId: in: jobId:${jobId}`);
        ow(jobId, ow.string.nonEmpty);
        const deploymentId = await this.deploymentTasksDao.getDeploymentIdByJobId(jobId);
        logger.debug(`templates.service getDeploymentIdByJobId: exit: ${deploymentId}`);
        return deploymentId;
    }

}

