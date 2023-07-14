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

import {
    BatchWriteCommandInput,
    DynamoDBDocumentClient,
    PutCommand,
    PutCommandInput,
    QueryCommand,
    QueryCommandInput,
    UpdateCommand,
    UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { logger } from '@awssolutions/simple-cdf-logger';
import { DynamoDbPaginationKey, GSI1_INDEX_NAME } from '../common/common.models';
import { CoreItem } from '../cores/cores.models';
import { TYPES } from '../di/types';
import { DocumentDbClientItem, DynamoDbUtils } from '../utils/dynamoDb.util';
import { PkType, createDelimitedAttribute, expandDelimitedAttribute } from '../utils/pkUtils.util';
import { CoreTaskItem } from './coreTasks.models';

@injectable()
export class CoreTasksDao {
    private dbc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient
    ) {
        this.dbc = ddcFactory();
    }

    public async get(taskId: string, summarize = false): Promise<CoreTaskItem> {
        logger.debug(`coreTasks.dao get: in: taskId:${taskId}, summarize:${summarize}`);

        const taskDbId = createDelimitedAttribute(PkType.CoreDeviceTask, taskId);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':pk': taskDbId,
            },
            ScanIndexForward: true,
        };

        if (summarize) {
            // only return the summary record if the summary is all we need
            params.KeyConditionExpression += ' AND #sk=:sk';
            params.ExpressionAttributeNames['#sk'] = 'sk';
            params.ExpressionAttributeValues[':sk'] = taskDbId;
        }
        const results = await this.dbc.send(new QueryCommand(params));
        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('coreTasks.dao get: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items)?.[0];
        logger.debug(`coreTasks.dao get: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async saveCoreTask(task: CoreTaskItem, saveBatchProgress: boolean): Promise<void> {
        logger.debug(
            `coreTasks.dao saveCoreTask: in: task:${JSON.stringify(
                task
            )}, saveBatchProgress:${saveBatchProgress}`
        );

        ow(task, ow.object.nonEmpty);
        ow(task.id, ow.string.nonEmpty);
        ow(task.taskStatus, ow.string.nonEmpty);

        if ((task.cores?.length ?? 0) > 0) {
            for (const core of task.cores) {
                ow(core?.name, ow.string.nonEmpty);
            }
        }

        const params: BatchWriteCommandInput = {
            RequestItems: {
                [process.env.AWS_DYNAMODB_TABLE_NAME]: [],
            },
        };

        // main task item
        const taskDbId = createDelimitedAttribute(PkType.CoreDeviceTask, task.id);
        const taskItem = {
            PutRequest: {
                Item: {
                    pk: taskDbId,
                    sk: taskDbId,
                    siKey1: PkType.CoreDeviceTask,
                    taskId: task.id,
                    type: task.type,
                    options: task.options,
                    coreVersion: task.coreVersion,
                    taskStatus: task.taskStatus,
                    statusMessage: task.statusMessage,
                    createdAt: task.createdAt?.toISOString(),
                    updatedAt: task.updatedAt?.toISOString(),
                },
            },
        };
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(taskItem);

        // batch processing status item
        if (task.batchesTotal > 0 && saveBatchProgress) {
            const batchDbId = createDelimitedAttribute(PkType.CoreDeviceTask, task.id, 'batches');
            const batchSummaryItem = {
                PutRequest: {
                    Item: {
                        pk: taskDbId,
                        sk: batchDbId,
                        batchesTotal: task.batchesTotal,
                        batchesComplete: task.batchesComplete,
                        createdAt: task.createdAt?.toISOString(),
                        updatedAt: task.updatedAt?.toISOString(),
                    },
                },
            };
            params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(batchSummaryItem);
        }

        if ((task.cores?.length ?? 0) > 0) {
            for (const core of task.cores) {
                // core device task detail item
                const coreDbId = createDelimitedAttribute(PkType.CoreDevice, core.name);
                const coreDeviceTaskDetailItem = {
                    PutRequest: {
                        Item: {
                            pk: taskDbId,
                            sk: coreDbId,
                            name: core.name,
                            taskStatus: (core as CoreItem).taskStatus,
                            statusMessage: (core as CoreItem).statusMessage,
                            createdAt: (core as CoreItem).createdAt?.toISOString(),
                            updatedAt: (core as CoreItem).updatedAt?.toISOString(),
                        },
                    },
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(
                    coreDeviceTaskDetailItem
                );

                // core device thing item
                const coreDeviceItem = {
                    PutRequest: {
                        Item: {
                            pk: coreDbId,
                            sk: coreDbId,
                            name: core.name,
                            siKey1: PkType.CoreDevice,
                            siKey2: createDelimitedAttribute(
                                PkType.Template,
                                'None',
                                PkType.CoreDevice
                            ),
                            siSort2: coreDbId,
                            siKey3: createDelimitedAttribute(
                                PkType.Template,
                                'None',
                                PkType.TemplateVersion,
                                0
                            ),
                            siSort3: coreDbId,
                            siSort4: coreDbId,
                            siSort5: coreDbId,
                            siSort6: coreDbId,
                            desiredTemplateName: 'None',
                            desiredTemplateVersion: 0,
                            reportedTemplateName: 'None',
                            reportedTemplateVersion: 0,
                            deploymentStatus: 'None',
                            createdAt: (core as CoreItem).createdAt?.toISOString(),
                            updatedAt: (core as CoreItem).updatedAt?.toISOString(),
                        },
                    },
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(coreDeviceItem);

                if ((core as CoreItem).artifacts !== undefined) {
                    for (const [name, artifact] of Object.entries((core as CoreItem).artifacts)) {
                        const artifactDbId = createDelimitedAttribute(
                            PkType.CoreDevice,
                            core.name,
                            PkType.Artifact,
                            name
                        );
                        const artifactItem = {
                            PutRequest: {
                                Item: {
                                    pk: coreDbId,
                                    sk: artifactDbId,
                                    name,
                                    bucket: artifact.bucket,
                                    key: artifact.key,
                                    createdAt: artifact.createdAt?.toISOString(),
                                },
                            },
                        };
                        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(
                            artifactItem
                        );
                    }
                }
            }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_CORE_TASK_FAILED');
        }

        logger.debug(`coreTasks.dao saveCoreTask: exit:`);
    }

    public async saveTaskDetail(taskId: string, core: CoreItem): Promise<void> {
        logger.debug(
            `coreTasks.dao saveTaskDetail: in: taskId:${taskId}, core:${JSON.stringify(core)}`
        );

        ow(taskId, ow.string.nonEmpty);
        ow(core, ow.object.nonEmpty);
        ow(core.name, ow.string.nonEmpty);

        // core device task detail item
        const taskDbId = createDelimitedAttribute(PkType.CoreDeviceTask, taskId);
        const coreDbId = createDelimitedAttribute(PkType.CoreDevice, core.name);
        const coreDeviceTaskDetailItem: PutCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Item: {
                pk: taskDbId,
                sk: coreDbId,
                name: core.name,
                taskStatus: core.taskStatus,
                statusMessage: core.statusMessage,
                createdAt: core.createdAt?.toISOString(),
                updatedAt: core.updatedAt?.toISOString(),
            },
        };

        await this.dbc.send(new PutCommand(coreDeviceTaskDetailItem));

        logger.debug(`coreTasks.dao saveTaskDetail: exit:`);
    }

    public async incrementBatchesCompleted(taskId: string): Promise<TaskBatchProgress> {
        logger.debug(`coreTasks.dao incrementBatchProgress: in: taskId:${taskId}`);

        // validation
        ow(taskId, ow.string.nonEmpty);

        const taskDbId = createDelimitedAttribute(PkType.CoreDeviceTask, taskId);
        const batchDbId = createDelimitedAttribute(PkType.CoreDeviceTask, taskId, 'batches');

        const params: UpdateCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Key: {
                pk: taskDbId,
                sk: batchDbId,
            },
            UpdateExpression: 'set batchesComplete = batchesComplete + :val',
            ExpressionAttributeValues: {
                ':val': 1,
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await this.dbc.send(new UpdateCommand(params));
        const response: TaskBatchProgress = {
            complete: result.Attributes['batchesComplete'],
            total: result.Attributes['batchesTotal'],
        };
        logger.debug(`coreTasks.dao incrementBatchProgress: exit: ${JSON.stringify(response)}`);
        return response;
    }

    private assemble(items: DocumentDbClientItem[]): CoreTaskItem[] {
        logger.debug(`coreTasks.dao assemble: items:${JSON.stringify(items)}`);
        if ((items?.length ?? 0) === 0) {
            return undefined;
        }

        const ct: { [taskId: string]: CoreTaskItem } = {};
        const c: { [taskId: string]: CoreItem[] } = {};
        items.forEach((item) => {
            const pk = expandDelimitedAttribute(item.pk);
            const sk = expandDelimitedAttribute(item.sk);
            const taskId = pk[1];

            if (sk.length === 2 && sk[0] === PkType.CoreDeviceTask) {
                // core task main item
                ct[taskId] = {
                    id: item.taskId,
                    coreVersion: item.coreVersion,
                    cores: [],
                    type: item.type,
                    options: item.options,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                };
            } else if (sk.length === 3 && sk[2] === 'batches') {
                // batch progress
                ct[taskId].batchesComplete = item.batchesComplete;
                ct[taskId].batchesTotal = item.batchesTotal;
            } else if (sk.length === 2 && sk[0] === PkType.CoreDevice) {
                // core device thing
                if (!c[taskId]) {
                    c[taskId] = [];
                }
                c[taskId].push({
                    name: item.name,
                    provisioningTemplate: item.provisioningTemplate,
                    provisioningParameters: item.provisioningParameters,
                    cdfProvisioningParameters: item.cdfProvisioningParameters,
                    artifacts: item.artifacts,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                });
            }
        });
        Object.keys(ct).forEach((k) => {
            ct[k].cores = c[k];
        });

        const response = Object.values(ct);
        logger.debug(`coreTasks.dao assemble: exit:${JSON.stringify(response)}`);
        return response;
    }

    public async list(
        count?: number,
        exclusiveStart?: CoreTaskListPaginationKey
    ): Promise<[CoreTaskItem[], CoreTaskListPaginationKey]> {
        logger.debug(
            `coreTasks.dao list: in: count:${count}, exclusiveStart:${JSON.stringify(
                exclusiveStart
            )}`
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.taskId) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.CoreDeviceTask, exclusiveStart.taskId),
                sk: createDelimitedAttribute(PkType.CoreDeviceTask, exclusiveStart.taskId),
                siKey1: PkType.CoreDeviceTask,
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI1_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1',
            },
            ExpressionAttributeValues: {
                ':hash': PkType.CoreDeviceTask,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`coreTasks.dao list: params: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('coreTasks.dao list: exit: undefined');
            return [undefined, undefined];
        }
        logger.silly(`coreTasks.dao list: results: ${JSON.stringify(results)}`);

        const response = this.assemble(results.Items);
        let paginationKey: CoreTaskListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedTaskId = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                taskId: lastEvaluatedTaskId,
            };
        }

        logger.debug(
            `coreTasks.dao list: exit: response:${JSON.stringify(
                response
            )}, paginationKey:${paginationKey}`
        );
        return [response, paginationKey];
    }
}

export interface TaskBatchProgress {
    complete: number;
    total: number;
}

export type CoreTaskListPaginationKey = {
    taskId: string;
};
