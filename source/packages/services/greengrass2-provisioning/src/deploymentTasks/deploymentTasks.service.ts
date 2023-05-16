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
import { generate } from 'shortid';

import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import {
    AwsIotThingListBuilder,
    THING_LIST_BUILDER_TYPES,
} from '@aws-solutions/cdf-thing-list-builder';

import { FailedCoreDeployment } from '../cores/cores.models';
import { CoresService } from '../cores/cores.service';
import { Deployment } from '../deployments/deployments.models';
import {
    DeploymentsService,
    DEPLOYMENT_TASK_ID_TAG_KEY,
} from '../deployments/deployments.service';
import { TYPES } from '../di/types';
import { TemplatesService } from '../templates/templates.service';
import { logger } from '../utils/logger.util';
import {
    CoreDeploymentListPaginationKey,
    DeploymentTaskListPaginationKey,
    DeploymentTasksDao,
} from './deploymentTasks.dao';
import { DeploymentTask, NewDeploymentTask } from './deploymentTasks.models';
import { DescribeJobCommand, IoTClient, ListTagsForResourceCommand } from '@aws-sdk/client-iot';

@injectable()
export class DeploymentTasksService {
    private sqs: SQSClient;
    private iot: IoTClient;

    public constructor(
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.DeploymentTasksDao) private deploymentTasksDao: DeploymentTasksDao,
        @inject(TYPES.DeploymentsService) private deploymentsService: DeploymentsService,
        @inject(TYPES.CoresService) private coresService: CoresService,
        @inject(THING_LIST_BUILDER_TYPES.AwsIotThingListBuilder)
        private awsIotThingListBuilder: AwsIotThingListBuilder,
        @inject(TYPES.SQSFactory) sqsFactory: () => SQSClient,
        @inject(TYPES.IotFactory) iotFactory: () => IoTClient
    ) {
        this.iot = iotFactory();
        this.sqs = sqsFactory();
    }

    public async create(request: NewDeploymentTask): Promise<string> {
        logger.debug(`deploymentTasks.service create: in: request:${JSON.stringify(request)}`);

        ow(request?.template?.name, 'template name', ow.string.nonEmpty);
        ow(request.targets, 'targets', ow.object.nonEmpty);

        const template = await this.templatesService.get(
            request.template.name,
            request.template.version
        );
        if (template === undefined) {
            throw new Error(`Requested template ${request.template.name} not found`);
        }

        // build the task to save, along with any defaults that need setting for new tasks
        const task: DeploymentTask = {
            id: generate(),
            template: {
                name: template.name,
                version: template.version as number,
            },
            deployments: [],
            targets: request.targets,
            iotJobConfig: request.iotJobConfig,
            taskStatus: 'Waiting',
            createdAt: new Date(),
        };

        // save it
        await this.deploymentTasksDao.saveDeploymentTask(task, true);

        // send the task for async processing
        await this.sqs.send(
            new SendMessageCommand({
                QueueUrl: process.env.AWS_SQS_QUEUES_DEPLOYMENT_TASKS,
                MessageBody: JSON.stringify(task),
                MessageAttributes: {
                    messageType: {
                        DataType: 'String',
                        StringValue: `DeploymentTask`,
                    },
                },
            })
        );

        logger.debug(`deploymentTasks.service create: exit: ${task.id}`);
        return task.id;
    }

    public async getCoreDeploymentStatus(taskId: string, coreName: string): Promise<Deployment> {
        logger.debug(
            `deploymentTasks.service getCoreDeploymentStatus: in: taskId:${taskId}, coreName:${coreName}`
        );

        ow(taskId, ow.string.nonEmpty);
        ow(coreName, ow.string.nonEmpty);

        const deployment = await this.deploymentTasksDao.getCoreDeploymentStatus(taskId, coreName);
        logger.debug(
            `deploymentTasks.service getCoreDeploymentStatus: exit: ${JSON.stringify(deployment)}`
        );
        return deployment;
    }

    public async listCoresByDeploymentTask(
        taskId: string,
        count?: number,
        lastEvaluated?: CoreDeploymentListPaginationKey
    ): Promise<[Deployment[], CoreDeploymentListPaginationKey]> {
        logger.debug(
            `deploymentTasks.service listCoresByDeploymentTask: in: taskId:${taskId}, count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated
            )}`
        );
        if (count) {
            count = Number(count);
        }

        const deployments = await this.deploymentTasksDao.listCoresByDeploymentTask(
            taskId,
            count,
            lastEvaluated
        );
        logger.debug(
            `deploymentTasks.service listCoresByDeploymentTask: exit: ${JSON.stringify(
                deployments
            )}`
        );
        return deployments;
    }

    public async list(
        count?: number,
        lastEvaluated?: DeploymentTaskListPaginationKey
    ): Promise<[DeploymentTask[], DeploymentTaskListPaginationKey]> {
        logger.debug(
            `deploymentTasks.service list: in: count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated
            )}`
        );

        if (count) {
            count = Number(count);
        }

        const deploymentTaskList = await this.deploymentTasksDao.list(count, lastEvaluated);
        logger.debug(`deploymentTasks.service list: exit: ${JSON.stringify(deploymentTaskList)}`);
        return deploymentTaskList;
    }

    public async get(taskId: string): Promise<DeploymentTask> {
        logger.debug(`deploymentTasks.service get: in: taskId:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        const template = await this.deploymentTasksDao.get(taskId, false);
        logger.debug(`deploymentTasks.service get: exit: ${JSON.stringify(template)}`);
        return template;
    }

    public async getByJobId(jobId: string): Promise<DeploymentTask> {
        logger.debug(`deploymentTasks.service getByJobId: in: jobId:${jobId}`);

        ow(jobId, ow.string.nonEmpty);

        const describeJobResponse = await this.iot.send(new DescribeJobCommand({ jobId: jobId }));
        const getTagsResponse = await this.iot.send(
            new ListTagsForResourceCommand({ resourceArn: describeJobResponse.job?.jobArn })
        );

        let deploymentTask;
        for (const tag of getTagsResponse.tags) {
            if (tag.Key === DEPLOYMENT_TASK_ID_TAG_KEY) {
                deploymentTask = this.get(tag.Value);
                return deploymentTask;
            }
        }

        logger.debug(
            `deploymentTasks.service getByJobId: exit: deploymentTask:${JSON.stringify(
                deploymentTask
            )}`
        );
        return deploymentTask;
    }

    /**
     * Expand the targets of the provided task, then splitting into batches for async processing.
     * @param task
     */
    public async processDeploymentTask(task: DeploymentTask): Promise<void> {
        logger.debug(
            `deploymentTasks.service processDeploymentTask: task:${JSON.stringify(task)}`
        );

        ow(task?.targets, 'targets', ow.object.nonEmpty);
        ow(task.id, 'task id', ow.string.nonEmpty);

        // 1st expand the targets. Can take time if there's quite a few to expand, hence why this is function if carried out async to break out of the APIGW execution timeout
        const expandedTargets = await this.awsIotThingListBuilder.listThings({
            thingNames: task.targets.thingNames,
            thingGroupNames: task.targets.thingGroupNames,
            assetLibraryDeviceIds: task.targets.assetLibraryDeviceIds,
            assetLibraryGroupPaths: task.targets.assetLibraryGroupPaths,
            assetLibraryQuery: task.targets.assetLibraryQuery,
        });
        ow(expandedTargets?.thingNames, 'expanded targets', ow.array.nonEmpty);
        task.deployments = expandedTargets.thingNames.map((t) => {
            return { coreName: t, taskStatus: 'Waiting' };
        });

        // there could be 1000's of expanded targets to process, therefore split into batches for more efficient processing
        const batcher = <T>(items: T[]) =>
            items.reduce((chunks: T[][], item: T, index) => {
                const chunk = Math.floor(index / parseInt(process.env.DEPLOYMENTS_BATCH_SIZE));
                chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                return chunks;
            }, []);
        const batches = batcher(task.deployments);
        task.batchesTotal = batches.length;
        task.batchesComplete = 0;

        // save it
        await this.deploymentTasksDao.saveDeploymentTask(task, true);

        // send each batch of deployments to sqs for async processing
        const sqsFutures: Promise<SendMessageCommandOutput>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const batch of batches) {
            sqsFutures.push(
                limit(() =>
                    this.sqs.send(
                        new SendMessageCommand({
                            QueueUrl: process.env.AWS_SQS_QUEUES_DEPLOYMENT_TASKS,
                            MessageBody: JSON.stringify({
                                id: task.id,
                                templateName: task.template.name,
                                templateVersion: task.template.version,
                                deployments: batch,
                            }),
                            MessageAttributes: {
                                messageType: {
                                    DataType: 'String',
                                    StringValue: `DeploymentTaskBatch`,
                                },
                            },
                        })
                    )
                )
            );
        }
        await Promise.all(sqsFutures);

        logger.debug(`deploymentTasks.service processDeploymentTask: exit:`);
    }

    public async processDeploymentTaskBatch(
        taskId: string,
        templateName: string,
        templateVersion: number,
        deployments: Deployment[]
    ): Promise<void> {
        logger.debug(
            `deploymentTasks.service processDeploymentTaskBatch: in: taskId:${taskId}, templateName:${templateName}, templateVersion:${templateVersion}, deployments:${JSON.stringify(
                deployments
            )}`
        );

        let failed = false;
        let failedReason: string;

        let processedDeployments: Deployment[];
        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(templateName, ow.string.nonEmpty);
            ow(deployments, ow.array.nonEmpty.minLength(1));

            // mark task as in progress
            const task = await this.deploymentTasksDao.get(taskId, true);
            if (task?.taskStatus === 'Waiting') {
                task.taskStatus = 'InProgress';
                task.updatedAt = new Date();
            }
            await this.deploymentTasksDao.saveDeploymentTask(task, false);

            // create the deployments
            processedDeployments = await this.deploymentsService.createDeployments(
                taskId,
                deployments
            );
        } catch (e) {
            logger.error(
                `deploymentTasks.service processDeploymentTaskBatch: e: ${e.name}: ${e.message}`
            );
            failed = true;
            failedReason = e.message;
        }

        // update the batch and task
        await this.saveBatchStatus(
            taskId,
            templateName,
            templateVersion,
            processedDeployments,
            failed,
            failedReason
        );

        logger.debug(`deploymentTasks.service processDeploymentTaskBatch: exit:`);
    }

    private async saveBatchStatus(
        taskId: string,
        templateName: string,
        templateVersion: number,
        deployments: Deployment[],
        failed: boolean,
        failedReason: string
    ): Promise<void> {
        logger.debug(
            `deploymentTasks.service saveBatchStatus: in: taskId:${taskId}, templateName:${templateName}, templateVersion:${templateVersion}, failed:${failed}, failedReason:${failedReason}, deployments:${JSON.stringify(
                deployments
            )}`
        );

        // update the batch progress
        const batchProgress = await this.deploymentTasksDao.incrementBatchesCompleted(taskId);

        //  update the task status
        const task = await this.deploymentTasksDao.get(taskId, true);
        if (task !== undefined) {
            // determine if any have failed
            const failedDeployments = deployments.filter((d) => d.taskStatus === 'Failure');
            const hasFailed = failedDeployments.length > 0;

            // if we have failed core deployments at this point (unable to start deployment), we need to update their core device deployment statuses
            if (hasFailed) {
                const failedCores: FailedCoreDeployment[] = failedDeployments.map((d) => {
                    return {
                        name: d.coreName,
                        templateName: templateName,
                        templateVersion: templateVersion,
                        deploymentStatus: d.taskStatus,
                        deploymentStatusMessage: d.statusMessage,
                    };
                });
                await this.coresService.associateFailedDeploymentStarts(failedCores);
            }

            if (failed === true || hasFailed === true) {
                task.taskStatus = 'Failure';
                task.statusMessage = task.statusMessage ?? failedReason;
                task.updatedAt = new Date();
            }
            // add in the updated core status to save
            task.deployments = deployments;

            // if all batches have been completed, update the overall task state to complete
            if (batchProgress.complete === batchProgress.total && task.taskStatus !== 'Failure') {
                task.taskStatus = 'Success';
                task.updatedAt = new Date();
            }
            await this.deploymentTasksDao.saveDeploymentTask(task, false);
        }

        logger.debug(`deploymentTasks.service saveBatchStatus: exit:`);
    }
}
