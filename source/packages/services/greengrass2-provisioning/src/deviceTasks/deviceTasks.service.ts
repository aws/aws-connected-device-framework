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
import { GetCoreDeviceCommand, GreengrassV2Client } from '@aws-sdk/client-greengrassv2';
import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';
import { generate } from 'shortid';
import { DeviceItem } from '../devices/devices.model';
import { DevicesService } from '../devices/devices.service';
import { TYPES } from '../di/types';
import { DeviceTasksDao } from './deviceTasks.dao';
import { DeviceTaskItem } from './deviceTasks.model';

@injectable()
export class DeviceTasksService {
    private sqs: SQSClient;
    private greengrassV2: GreengrassV2Client;

    public constructor(
        @inject(TYPES.DeviceTasksDao) private deviceTasksDao: DeviceTasksDao,
        @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.SQSFactory) sqsFactory: () => SQSClient,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client
    ) {
        this.sqs = sqsFactory();
        this.greengrassV2 = ggv2Factory();
    }

    public async get(taskId: string): Promise<DeviceTaskItem> {
        logger.debug(`deviceTasks.service get: in: taskId:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        const template = await this.deviceTasksDao.get(taskId, false);
        logger.debug(`deviceTasks.service get: exit: ${JSON.stringify(template)}`);
        return template;
    }

    public async create(request: DeviceTaskItem, coreName: string): Promise<string> {
        logger.debug(
            `deviceTasks.service create: in: request:${JSON.stringify(
                request
            )}, coreName: ${coreName}`
        );

        ow(request, ow.object.nonEmpty);
        ow(coreName, 'core name', ow.string.nonEmpty);
        ow(request.devices, 'devices', ow.array.nonEmpty);
        ow(request.type, 'type', ow.string.oneOf(['Create', 'Delete']));

        for (const c of request.devices) {
            ow(c.name, 'device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'device provisioning template', ow.string.nonEmpty);
        }

        if (request.type === 'Delete') {
            ow(request.options, 'delete devices options', ow.object.nonEmpty);
        }

        try {
            // Check if core device exists or not
            const response = await this.greengrassV2.send(
                new GetCoreDeviceCommand({
                    coreDeviceThingName: coreName,
                })
            );
            logger.silly(
                `deviceTasks.service create: in: core:${response.coreDeviceThingName} exists`
            );
        } catch (Exception) {
            logger.error(`deviceTasks.service create: error: core:${coreName} does not exists`);
            throw new Error(`FAILED_VALIDATION`);
        }

        // build the task to save, along with any defaults that need setting for new tasks
        const task: DeviceTaskItem = {
            id: generate(),
            coreName,
            devices: request.devices.map((c) => {
                return {
                    ...c,
                    taskStatus: 'Waiting',
                    coreName,
                    createdAt: new Date(),
                };
            }),
            type: request.type,
            options: request.options,
            taskStatus: 'Waiting',
            createdAt: new Date(),
        };

        // there could be 100's of requested devices, therefore split into batches for more efficient processing
        const batcher = <T>(items: T[]) =>
            items.reduce((chunks: T[][], item: T, index) => {
                const chunk = Math.floor(index / parseInt(process.env.DEVICES_BATCH_SIZE));
                chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                return chunks;
            }, []);
        const batches = batcher(task.devices);
        task.batchesTotal = batches.length;
        task.batchesComplete = 0;

        // save it
        await this.deviceTasksDao.saveDeviceTask(task, true);

        // send each batch of devices to sqs for async processing
        const sqsFutures: Promise<SendMessageCommandOutput>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const batch of batches) {
            sqsFutures.push(
                limit(() =>
                    this.sqs.send(
                        new SendMessageCommand({
                            QueueUrl: process.env.AWS_SQS_QUEUES_DEVICE_TASKS,
                            MessageBody: JSON.stringify({
                                taskId: task.id,
                                devices: batch,
                            }),
                            MessageAttributes: {
                                messageType: {
                                    DataType: 'String',
                                    StringValue: `DeviceTask:${request.type}`,
                                },
                            },
                        })
                    )
                )
            );
        }
        await Promise.all(sqsFutures);

        logger.debug(`deviceTasks.service create: exit: ${task.id}`);
        return task.id;
    }

    public async processDeleteDeviceTaskBatch(
        taskId: string,
        devices: DeviceItem[]
    ): Promise<void> {
        logger.debug(
            `deviceTasks.service processDeleteDeviceTaskBatch: in: taskId:${taskId}, devices:${JSON.stringify(
                devices
            )}`
        );

        let failed = false;
        let failedReason: string;

        let deletedDevices: DeviceItem[];
        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(devices, ow.array.nonEmpty.minLength(1));

            // mark task as in progress
            const task = await this.deviceTasksDao.get(taskId, true);
            if (task?.taskStatus === 'Waiting') {
                task.taskStatus = 'InProgress';
                task.updatedAt = new Date();
            }
            await this.deviceTasksDao.saveDeviceTask(task, false);

            // create the cores
            deletedDevices = await this.devicesService.deleteDevices(task, devices);
            deletedDevices = await this.devicesService.disassociateDevicesFromCore(
                task,
                deletedDevices,
                task.coreName
            );
        } catch (e) {
            logger.error(
                `devices.service processDeleteDeviceTaskBatch: e: ${e.name}: ${e.message}`
            );
            failed = true;
            failedReason = e.message;
        }

        // update the batch and task
        await this.saveBatchStatus(taskId, deletedDevices, failed, failedReason);

        logger.debug(`deviceTasks.service processDeleteDeviceTaskBatch: exit:`);
    }

    public async processCreateDeviceTaskBatch(
        taskId: string,
        devices: DeviceItem[]
    ): Promise<void> {
        logger.debug(
            `deviceTasks.service processCreateDeviceTaskBatch: in: taskId:${taskId}, devices:${JSON.stringify(
                devices
            )}`
        );

        let failed = false;
        let failedReason: string;

        let processedDevices: DeviceItem[];
        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(devices, ow.array.nonEmpty.minLength(1));

            // mark task as in progress
            const task = await this.deviceTasksDao.get(taskId, true);
            if (task?.taskStatus === 'Waiting') {
                task.taskStatus = 'InProgress';
                task.updatedAt = new Date();
            }
            await this.deviceTasksDao.saveDeviceTask(task, false);

            // create the cores
            processedDevices = await this.devicesService.createDevices(task, devices);
            processedDevices = await this.devicesService.associateDevicesWithCore(
                task,
                processedDevices,
                task.coreName
            );
        } catch (e) {
            logger.error(
                `coreTasks.service processCreateDeviceTaskBatch: e: ${e.name}: ${e.message}`
            );
            failed = true;
            failedReason = e.message;
        }

        // update the batch and task
        await this.saveBatchStatus(taskId, processedDevices, failed, failedReason);

        logger.debug(`deviceTasks.service processCreateDeviceTaskBatch: exit:`);
    }

    private async saveBatchStatus(
        taskId: string,
        devices: DeviceItem[],
        failed: boolean,
        failedReason: string
    ): Promise<void> {
        logger.debug(
            `deviceTasks.service saveBatchStatus: in: taskId:${taskId}, failed:${failed}, failedReason:${failedReason}, devices:${JSON.stringify(
                devices
            )}`
        );

        // update the batch progress
        const batchProgress = await this.deviceTasksDao.incrementBatchesCompleted(taskId);

        //  update the task status
        const task = await this.deviceTasksDao.get(taskId, true);
        if (task !== undefined) {
            // determine if failed
            const hasFailedCores = devices.some((c) => c.taskStatus === 'Failure');
            if (failed === true || hasFailedCores === true) {
                task.taskStatus = 'Failure';
                task.statusMessage = task.statusMessage ?? failedReason;
                task.updatedAt = new Date();
            }

            if (task.type === 'Create') {
                // add in the updated core status to save
                // We don't want to recreate deleted devices when task is delete
                task.devices = devices;
            }

            // if all batches have been completed, update the overall task state to complete
            if (batchProgress.complete === batchProgress.total && task.taskStatus !== 'Failure') {
                task.taskStatus = 'Success';
                task.updatedAt = new Date();
            }
            await this.deviceTasksDao.saveDeviceTask(task, false);
        }
        logger.debug(`deviceTasks.service saveBatchStatus: exit:`);
    }
}
