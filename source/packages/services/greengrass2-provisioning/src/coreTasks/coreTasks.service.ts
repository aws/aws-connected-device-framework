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

import { CoreItem } from '../cores/cores.models';
import { CoresService } from '../cores/cores.service';
import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { CoreTaskListPaginationKey, CoreTasksDao } from './coreTasks.dao';
import { CoreTaskItem } from './coreTasks.models';
import { DeviceTasksService } from '../deviceTasks/deviceTasks.service';
import {
    GreengrassV2Client,
    ListClientDevicesAssociatedWithCoreDeviceCommand,
} from '@aws-sdk/client-greengrassv2';

@injectable()
export class CoreTasksService {
    private sqs: SQSClient;
    private ggv2: GreengrassV2Client;

    public constructor(
        @inject(TYPES.CoreTasksDao) private coreTasksDao: CoreTasksDao,
        @inject(TYPES.CoresService) private coresService: CoresService,
        @inject(TYPES.DeviceTasksService) private deviceTaskService: DeviceTasksService,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client,
        @inject(TYPES.SQSFactory) sqsFactory: () => SQSClient,
    ) {
        this.sqs = sqsFactory();
        this.ggv2 = ggv2Factory();
    }

    public async create(request: CoreTaskItem): Promise<string> {
        logger.debug(`coreTasks.service create: in: request:${JSON.stringify(request)}`);

        ow(request, ow.object.nonEmpty);
        ow(request.coreVersion, 'core version', ow.string.nonEmpty);
        ow(request.cores, 'cores', ow.array.nonEmpty);
        ow(request.type, 'type', ow.string.oneOf(['Create', 'Delete']));

        for (const c of request.cores) {
            ow(c.name, 'core name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'core provisioning template', ow.string.nonEmpty);
        }

        if (request.type === 'Delete') {
            ow(request.options, 'delete core options', ow.object.nonEmpty);
        }

        // build the task to save, along with any defaults that need setting for new tasks
        const task: CoreTaskItem = {
            id: generate(),
            type: request.type,
            coreVersion: request.coreVersion,
            cores: request.cores.map((c) => {
                return {
                    ...c,
                    taskStatus: 'Waiting',
                    createdAt: new Date(),
                };
            }),
            options: request.options,
            taskStatus: 'Waiting',
            createdAt: new Date(),
        };

        // We use 1 batch size for Delete because the deletion flow depends on the asynchronous flow of delete device task
        const batchSize = task.type === 'Delete' ? 1 : parseInt(process.env.CORES_BATCH_SIZE);

        // there could be 1000's of requested cores, therefore split into batches for more efficient processing
        const batcher = <T>(items: T[]) =>
            items.reduce((chunks: T[][], item: T, index) => {
                const chunk = Math.floor(index / batchSize);
                chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                return chunks;
            }, []);
        const batches = batcher(task.cores);
        task.batchesTotal = batches.length;
        task.batchesComplete = 0;

        // save it
        await this.coreTasksDao.saveCoreTask(task, true);

        // send each batch of cores to sqs for async processing
        const sqsFutures: Promise<SendMessageCommandOutput>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const batch of batches) {
            sqsFutures.push(
                limit(() =>
                    this.sqs.send(
                        new SendMessageCommand({
                            QueueUrl: process.env.AWS_SQS_QUEUES_CORE_TASKS,
                            MessageBody: JSON.stringify({
                                taskId: task.id,
                                cores: batch,
                            }),
                            MessageAttributes: {
                                messageType: {
                                    DataType: 'String',
                                    StringValue: `CoreTask:${task.type}`,
                                },
                            },
                        }),
                    ),
                ),
            );
        }
        await Promise.all(sqsFutures);

        logger.debug(`coreTasks.service create: exit: ${task.id}`);
        return task.id;
    }

    public async get(taskId: string): Promise<CoreTaskItem> {
        logger.debug(`coreTasks.service get: in: taskId:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        const template = await this.coreTasksDao.get(taskId, false);
        logger.debug(`coreTasks.service get: exit: ${JSON.stringify(template)}`);
        return template;
    }

    public async disassociateDevicesFromCoreAsync(
        task: CoreTaskItem,
        core: CoreItem,
        deprovisionClientDevices: boolean,
    ): Promise<void> {
        logger.debug(
            `coreTasks.service disassociateDevicesFromCoreAsync: in: task:${JSON.stringify(
                task,
            )}, core:${JSON.stringify(core)}`,
        );

        ow(core, ow.object.nonEmpty);
        ow(task, ow.object.nonEmpty);

        const placeHolderProvisioningTemplate = 'UNUSED_TEMPLATE';

        try {
            const listDevicesResponse = await this.ggv2.send(
                new ListClientDevicesAssociatedWithCoreDeviceCommand({
                    coreDeviceThingName: core.name,
                }),
            );
            if (listDevicesResponse.associatedClientDevices.length > 0) {
                const devicesToDelete = listDevicesResponse.associatedClientDevices.map((o) => {
                    return {
                        coreName: core.name,
                        name: o.thingName,
                        provisioningTemplate: placeHolderProvisioningTemplate,
                    };
                });
                const deviceTaskId = await this.deviceTaskService.create(
                    {
                        coreName: core.name,
                        devices: devicesToDelete,
                        type: 'Delete',
                        options: { deprovisionClientDevices: deprovisionClientDevices },
                    },
                    core.name,
                );
                await this.publishCoreTaskStatusCheck(task.id, deviceTaskId);
            } else {
                const deletedCore = await this.coresService.deleteCore(
                    task,
                    core.name,
                    deprovisionClientDevices,
                );
                await this.saveBatchStatus(task.id, [deletedCore], false, undefined);
            }
        } catch (e) {
            logger.error(`coreTasks.service processCoreTaskBatch: e: ${e.name}: ${e.message}`);
            const failed = true;
            const failedReason = e.message;
            await this.saveBatchStatus(task.id, [core], failed, failedReason);
        }

        logger.debug(`coreTasks.service disassociateDevicesFromCoreAsync: exit:`);
    }

    private async publishCoreTaskStatusCheck(
        coreTaskId: string,
        deviceTaskId: string,
        counter = 0,
    ): Promise<void> {
        logger.debug(
            `coreTasks.service publishCoreTaskStatusCheck: in: coreTaskId:${coreTaskId}, deviceTaskId:${deviceTaskId}`,
        );
        await this.sqs.send(
            new SendMessageCommand({
                QueueUrl: process.env.AWS_SQS_QUEUES_CORE_TASKS_STATUS,
                MessageBody: JSON.stringify({ coreTaskId, deviceTaskId, counter: ++counter }),
                MessageAttributes: {
                    messageType: {
                        DataType: 'String',
                        StringValue: 'CoreTaskStatus',
                    },
                },
                DelaySeconds: 5,
            }),
        );
        logger.debug(`coreTasks.service publishCoreTaskStatusCheck: exit`);
    }

    public async updateCoreTaskStatus(
        coreTaskId: string,
        deviceTaskId: string,
        counter: number,
    ): Promise<void> {
        logger.debug(
            `coreTasks.service updateCoreTaskStatus: in: coreTaskId:${coreTaskId}, deviceTaskId:${deviceTaskId}, counter: ${counter}`,
        );

        const { taskStatus, statusMessage, coreName } = await this.deviceTaskService.get(
            deviceTaskId,
        );

        if (counter > (process.env.CORE_TASK_STATUS_QUEUE_COUNTER as unknown as number)) {
            logger.error(`coreTasks.service updateCoreTaskStatus: counter has reached max number`);
            return;
        }

        if (taskStatus === 'InProgress') {
            this.publishCoreTaskStatusCheck(coreTaskId, deviceTaskId, counter);
            return;
        }

        let failed = false;
        let failedReason: string;

        const core = await this.coresService.get(coreName);

        try {
            if (taskStatus === 'Failure') {
                core.taskStatus = taskStatus;
                core.updatedAt = new Date();
                core.statusMessage = statusMessage;
                await this.coreTasksDao.saveTaskDetail(coreTaskId, core);
            } else {
                const coreTask = await this.get(coreTaskId);
                await this.coresService.deleteCore(
                    coreTask,
                    core.name,
                    coreTask.options?.deprovisionCores,
                );
            }
        } catch (e) {
            logger.error(`coreTasks.service updateCoreTaskStatus: e: ${e.name}: ${e.message}`);
            failed = true;
            failedReason = e.message;
        }

        await this.saveBatchStatus(coreTaskId, [core], failed, failedReason);
        logger.debug(`coreTasks.service updateCoreTaskStatus: exit:`);
    }

    public async processDeleteCoreTaskBatch(taskId: string, cores: CoreItem[]): Promise<void> {
        logger.debug(
            `coreTasks.service processDeleteCoreTaskBatch: in: taskId:${taskId}, cores:${JSON.stringify(
                cores,
            )}`,
        );
        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(cores, ow.array.length(1));

            const core = cores[0];
            core.createdAt = new Date();
            core.updatedAt = new Date();

            // mark task as in progress
            const task = await this.coreTasksDao.get(taskId, true);
            if (task?.taskStatus === 'Waiting') {
                task.taskStatus = 'InProgress';
                task.updatedAt = new Date();
                task.createdAt = new Date();
            }
            await this.coreTasksDao.saveCoreTask(task, false);
            await this.disassociateDevicesFromCoreAsync(
                task,
                core,
                task.options?.deprovisionClientDevices,
            );
        } catch (e) {
            logger.error(
                `coreTasks.service processDeleteCoreTaskBatch: e: ${e.name}: ${e.message}`,
            );
        }

        logger.debug(`coreTasks.service processDeleteCoreTaskBatch: exit:`);
    }

    public async processCreateCoreTaskBatch(taskId: string, cores: CoreItem[]): Promise<void> {
        logger.debug(
            `coreTasks.service processCreateCoreTaskBatch: in: taskId:${taskId}, cores:${JSON.stringify(
                cores,
            )}`,
        );

        let failed = false;
        let failedReason: string;

        let processedCores: CoreItem[];
        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(cores, ow.array.nonEmpty.minLength(1));

            // mark task as in progress
            const task = await this.coreTasksDao.get(taskId, true);
            if (task?.taskStatus === 'Waiting') {
                task.taskStatus = 'InProgress';
                task.updatedAt = new Date();
            }
            await this.coreTasksDao.saveCoreTask(task, false);

            // create the cores
            processedCores = await this.coresService.createCores(task, cores);
        } catch (e) {
            logger.error(
                `coreTasks.service processCreateCoreTaskBatch: e: ${e.name}: ${e.message}`,
            );
            failed = true;
            failedReason = e.message;
        }

        // update the batch and task
        await this.saveBatchStatus(taskId, processedCores, failed, failedReason);

        logger.debug(`coreTasks.service processCreateCoreTaskBatch: exit:`);
    }

    private async saveBatchStatus(
        taskId: string,
        cores: CoreItem[],
        failed: boolean,
        failedReason: string,
    ): Promise<void> {
        logger.debug(
            `coreTasks.service saveBatchStatus: in: taskId:${taskId}, failed:${failed}, failedReason:${failedReason}, cores:${JSON.stringify(
                cores,
            )}`,
        );

        // update the batch progress
        const batchProgress = await this.coreTasksDao.incrementBatchesCompleted(taskId);

        //  update the task status
        const task = await this.coreTasksDao.get(taskId, true);

        if (task !== undefined) {
            // determine if failed
            const hasFailedCores = cores.some((c) => c.taskStatus === 'Failure');
            if (failed === true || hasFailedCores === true) {
                task.taskStatus = 'Failure';
                task.statusMessage = task.statusMessage ?? failedReason;
                task.updatedAt = new Date();
            }

            if (task.type === 'Create') {
                // add in the updated core status to save
                task.cores = cores;
            }

            // if all batches have been completed, update the overall task state to complete
            if (batchProgress.complete === batchProgress.total && task.taskStatus !== 'Failure') {
                task.taskStatus = 'Success';
                task.updatedAt = new Date();
            }
            await this.coreTasksDao.saveCoreTask(task, false);
        }
        logger.debug(`coreTasks.service saveBatchStatus: exit:`);
    }

    public async list(
        count?: number,
        exclusiveStart?: CoreTaskListPaginationKey,
    ): Promise<[CoreTaskItem[], CoreTaskListPaginationKey]> {
        logger.debug(
            `coreTasks.service list: in: count:${count}, exclusiveStart:${JSON.stringify(
                exclusiveStart,
            )}`,
        );

        if (count) {
            count = Number(count);
        }
        const result = await this.coreTasksDao.list(count, exclusiveStart);

        logger.debug(`coreTasks.service list: exit: ${JSON.stringify(result)}`);
        return result;
    }
}
