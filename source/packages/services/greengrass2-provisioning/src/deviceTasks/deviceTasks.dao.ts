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
import { BatchWriteCommandInput, DynamoDBDocumentClient, PutCommand, PutCommandInput, QueryCommand, QueryCommandInput, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { inject, injectable } from "inversify";
import { DynamoDbPaginationKey, GSI1_INDEX_NAME } from "../common/common.models";
import { DeviceItem } from "../devices/devices.model";
import { TYPES } from "../di/types";
import { DocumentDbClientItem, DynamoDbUtils } from "../utils/dynamoDb.util";
import { logger } from '@awssolutions/simple-cdf-logger';
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from "../utils/pkUtils.util";
import { DeviceTaskItem } from "./deviceTasks.model";
import ow from 'ow';


@injectable()
export class DeviceTasksDao {
    private dbc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
    ) {
        this.dbc = ddcFactory()
    }

    public async get(taskId: string, summarize = false): Promise<DeviceTaskItem> {
        logger.debug(`deviceTasks.dao get: in: taskId:${taskId}, summarize:${summarize}`);

        const taskDbId = createDelimitedAttribute(PkType.ClientDeviceTask, taskId);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk'
            },
            ExpressionAttributeValues: {
                ':pk': taskDbId
            },
            ScanIndexForward: true
        };

        if (summarize) {
            // only return the summary record if the summary is all we need
            params.KeyConditionExpression += ' AND #sk=:sk';
            params.ExpressionAttributeNames['#sk'] = 'sk';
            params.ExpressionAttributeValues[':sk'] = taskDbId;
        }
        const results = await this.dbc.send(new QueryCommand(params));
        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('deviceTasks.dao get: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items)?.[0];
        logger.debug(`deviceTasks.dao get: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async incrementBatchesCompleted(taskId: string): Promise<TaskBatchProgress> {
        logger.debug(`deviceTasks.dao incrementBatchProgress: in: taskId:${taskId}`);

        // validation
        ow(taskId, ow.string.nonEmpty);

        const taskDbId = createDelimitedAttribute(PkType.ClientDeviceTask, taskId);
        const batchDbId = createDelimitedAttribute(PkType.ClientDeviceTask, taskId, 'batches');

        const params: UpdateCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Key: {
                pk: taskDbId,
                sk: batchDbId
            },
            UpdateExpression: 'set batchesComplete = batchesComplete + :val',
            ExpressionAttributeValues: {
                ':val': 1
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await this.dbc.send(new UpdateCommand(params));
        const response: TaskBatchProgress = {
            complete: result.Attributes['batchesComplete'],
            total: result.Attributes['batchesTotal']
        };
        logger.debug(`deviceTasks.dao incrementBatchProgress: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async saveDeviceTask(task: DeviceTaskItem, saveBatchProgress: boolean): Promise<void> {
        logger.debug(`coreTasks.dao saveCoreTask: in: task:${JSON.stringify(task)}, saveBatchProgress:${saveBatchProgress}`);

        ow(task, ow.object.nonEmpty);
        ow(task.id, ow.string.nonEmpty);
        ow(task.taskStatus, ow.string.nonEmpty);

        if ((task.devices?.length ?? 0) > 0) {
            for (const device of task.devices) {
                ow(device?.name, ow.string.nonEmpty);
            }
        }

        const params: BatchWriteCommandInput = {
            RequestItems: {
                [process.env.AWS_DYNAMODB_TABLE_NAME]: []
            }
        };

        // main task item
        const taskDbId = createDelimitedAttribute(PkType.ClientDeviceTask, task.id);
        const taskItem = {
            PutRequest: {
                Item: {
                    pk: taskDbId,
                    sk: taskDbId,
                    siKey1: PkType.ClientDeviceTask,
                    taskId: task.id,
                    taskStatus: task.taskStatus,
                    statusMessage: task.statusMessage,
                    type: task.type,
                    options: task.options,
                    coreName: task.coreName,
                    createdAt: task.createdAt?.toISOString(),
                    updatedAt: task.updatedAt?.toISOString()
                }
            }
        };
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(taskItem);

        // batch processing status item
        if (task.batchesTotal > 0 && saveBatchProgress) {
            const batchDbId = createDelimitedAttribute(PkType.ClientDeviceTask, task.id, 'batches');
            const batchSummaryItem = {
                PutRequest: {
                    Item: {
                        pk: taskDbId,
                        sk: batchDbId,
                        batchesTotal: task.batchesTotal,
                        batchesComplete: task.batchesComplete,
                        createdAt: task.createdAt?.toISOString(),
                        updatedAt: task.updatedAt?.toISOString()
                    }
                }
            };
            params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(batchSummaryItem);
        }

        if ((task.devices?.length ?? 0) > 0) {
            for (const device of task.devices) {

                // client device task detail item
                const deviceDbId = createDelimitedAttribute(PkType.ClientDevice, device.name);
                const clientDeviceTaskDetailItem = {
                    PutRequest: {
                        Item: {
                            pk: taskDbId,
                            sk: deviceDbId,
                            name: device.name,
                            coreName: device.coreName,
                            taskStatus: (device as DeviceItem).taskStatus,
                            statusMessage: (device as DeviceItem).statusMessage,
                            createdAt: (device as DeviceItem).createdAt?.toISOString(),
                            updatedAt: (device as DeviceItem).updatedAt?.toISOString()
                        }
                    }
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(clientDeviceTaskDetailItem);
                // client device thing item
                const clientDeviceItem = {
                    PutRequest: {
                        Item: {
                            pk: deviceDbId,
                            sk: deviceDbId,
                            name: device.name,
                            siKey1: PkType.ClientDevice,
                            siKey2: createDelimitedAttribute(PkType.CoreDevice, device.coreName),
                            siSort2: deviceDbId,
                            createdAt: (device as DeviceItem).createdAt?.toISOString(),
                            updatedAt: (device as DeviceItem).updatedAt?.toISOString()
                        }
                    }
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(clientDeviceItem);

                if ((device as DeviceItem).artifacts !== undefined) {
                    for (const [name, artifact] of Object.entries((device as DeviceItem).artifacts)) {
                        const artifactDbId = createDelimitedAttribute(PkType.ClientDevice, device.name, PkType.Artifact, name);
                        const artifactItem = {
                            PutRequest: {
                                Item: {
                                    pk: deviceDbId,
                                    sk: artifactDbId,
                                    name,
                                    bucket: artifact.bucket,
                                    key: artifact.key,
                                    createdAt: artifact.createdAt?.toISOString()
                                }
                            }
                        };
                        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(artifactItem);
                    }
                }
            }
        }


        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_DEVICE_TASK_FAILED');
        }

        logger.debug(`deviceTasks.dao saveDeviceTask: exit:`);

    }

    public async saveTaskDetail(taskId: string, device: DeviceItem): Promise<void> {
        logger.debug(`deviceTasks.dao saveTaskDetail: in: taskId:${taskId}, core:${JSON.stringify(device)}`);

        ow(taskId, ow.string.nonEmpty);
        ow(device, ow.object.nonEmpty);
        ow(device.name, ow.string.nonEmpty);


        // core device task detail item
        const taskDbId = createDelimitedAttribute(PkType.ClientDeviceTask, taskId);
        const clientDbId = createDelimitedAttribute(PkType.ClientDevice, device.name);
        const clientDeviceTaskDetailItem: PutCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Item: {
                pk: taskDbId,
                sk: clientDbId,
                name: device.name,
                taskStatus: device.taskStatus,
                statusMessage: device.statusMessage,
                createdAt: device.createdAt?.toISOString(),
                updatedAt: device.updatedAt?.toISOString()
            }
        };

        await this.dbc.send(new PutCommand(clientDeviceTaskDetailItem));

        logger.debug(`deviceTasks.dao saveTaskDetail: exit:`);
    }


    private assemble(items: DocumentDbClientItem[]): DeviceTaskItem[] {
        logger.debug(`deviceTasks.dao assemble: items:${JSON.stringify(items)}`);
        if ((items?.length ?? 0) === 0) {
            return undefined;
        }

        const ct: { [taskId: string]: DeviceTaskItem } = {};
        const c: { [taskId: string]: DeviceItem[] } = {};
        items.forEach(item => {
            const pk = expandDelimitedAttribute(item.pk);
            const sk = expandDelimitedAttribute(item.sk);
            const taskId = pk[1];

            if (sk.length === 2 && sk[0] === PkType.ClientDeviceTask) {
                // core task main item
                ct[taskId] = {
                    id: item.taskId,
                    devices: [],
                    coreName: item.coreName,
                    type: item.type,
                    options: item.options,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt)
                }
            } else if (sk.length === 3 && sk[2] === 'batches') {
                // batch progress
                ct[taskId].batchesComplete = item.batchesComplete;
                ct[taskId].batchesTotal = item.batchesTotal;
            } else if (sk.length === 2 && sk[0] === PkType.ClientDevice) {
                // core device thing
                if (!c[taskId]) {
                    c[taskId] = [];
                }

                let coreName;
                if (item.s1Key2) {
                    logger.info(JSON.stringify(item))
                    const sk2 = expandDelimitedAttribute(item.siKey2)
                    coreName = sk2[1];
                }


                c[taskId].push({
                    name: item.name,
                    coreName,
                    provisioningTemplate: item.provisioningTemplate,
                    provisioningParameters: item.provisioningParameters,
                    cdfProvisioningParameters: item.cdfProvisioningParameters,
                    artifacts: item.artifacts,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt)
                });
            }
        });
        Object.keys(ct).forEach(k => {
            ct[k].devices = c[k];
        });

        const response = Object.values(ct);
        logger.debug(`deviceTasks.dao assemble: exit:${JSON.stringify(response)}`);
        return response;
    }

    public async list(count?: number, exclusiveStart?: DeviceTaskListPaginationKey): Promise<[DeviceTaskItem[], DeviceTaskListPaginationKey]> {
        logger.debug(`deviceTasks.dao list: in: count:${count}, exclusiveStart:${JSON.stringify(exclusiveStart)}`);

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.taskId) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.ClientDeviceTask, exclusiveStart.taskId),
                sk: createDelimitedAttribute(PkType.ClientDeviceTask, exclusiveStart.taskId),
                siKey1: PkType.ClientDeviceTask,
            }
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI1_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1'
            },
            ExpressionAttributeValues: {
                ':hash': PkType.ClientDeviceTask
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count
        };

        logger.silly(`deviceTasks.dao list: params: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('deviceTasks.dao list: exit: undefined');
            return [undefined, undefined];
        }
        logger.silly(`deviceTasks.dao list: results: ${JSON.stringify(results)}`);

        const response = this.assemble(results.Items);
        let paginationKey: DeviceTaskListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedTaskId = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                taskId: lastEvaluatedTaskId
            }
        }

        logger.debug(`deviceTasks.dao list: exit: response:${JSON.stringify(response)}, paginationKey:${paginationKey}`);
        return [response, paginationKey];
    }

}

export type DeviceTaskListPaginationKey = {
    taskId: string;
}

export interface TaskBatchProgress {
    complete: number;
    total: number;
}
