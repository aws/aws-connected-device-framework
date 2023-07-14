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
    GetCommand,
    GetCommandInput,
    PutCommand,
    PutCommandInput,
    QueryCommand,
    QueryCommandInput,
    UpdateCommand,
    UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '@awssolutions/simple-cdf-logger';
import { DynamoDbPaginationKey, GSI1_INDEX_NAME, GSI3_INDEX_NAME } from '../common/common.models';
import { Deployment } from '../deployments/deployments.models';
import { TYPES } from '../di/types';
import { DocumentDbClientItem, DynamoDbUtils } from '../utils/dynamoDb.util';
import { PkType, createDelimitedAttribute, expandDelimitedAttribute } from '../utils/pkUtils.util';
import { DeploymentTask } from './deploymentTasks.models';

@injectable()
export class DeploymentTasksDao {
    private dbc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
    ) {
        this.dbc = ddcFactory();
    }

    public async getCoreDeploymentStatus(taskId: string, coreName: string): Promise<Deployment> {
        logger.debug(
            `deploymentTasks.dao getDeploymentTaskStatusByCore: in: taskId:${taskId}, coreName:${coreName}}`,
        );

        const params: GetCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Key: {
                pk: createDelimitedAttribute(PkType.DeploymentTask, taskId),
                sk: createDelimitedAttribute(PkType.CoreDevice, coreName),
            },
        };
        const result = await this.dbc.send(new GetCommand(params));

        if (!result.Item) {
            logger.debug('deploymentTasks.dao getDeploymentTaskStatusByCore: exit: undefined');
            return undefined;
        }

        const deployment = this.assembleDeployment(result.Item);
        logger.debug(
            `deploymentTasks.dao getDeploymentTaskStatusByCore: exit: deployment:${deployment}}`,
        );

        return deployment;
    }

    public async listDeploymentsByCore(
        coreName: string,
        count?: number,
        lastEvaluated?: DeploymentTaskListPaginationKey,
    ): Promise<[Deployment[], DeploymentTaskListPaginationKey]> {
        logger.debug(
            `deploymentTasks.dao listDeploymentsByCore: in: coreName:${coreName}, count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;

        if (lastEvaluated?.taskId) {
            exclusiveStartKey = {
                siKey1: createDelimitedAttribute(PkType.CoreDevice, coreName),
                sk: createDelimitedAttribute(PkType.CoreDevice, coreName),
                pk: createDelimitedAttribute(PkType.DeploymentTask, lastEvaluated.taskId),
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI1_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash  AND begins_with( #sortKey, :sortKey )`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1',
                '#sortKey': 'pk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.CoreDevice, coreName),
                ':sortKey': createDelimitedAttribute(PkType.DeploymentTask),
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('deploymentTasks.dao listDeploymentsByCore: exit: undefined');
            return [[], undefined];
        }

        const deployments = this.assembleDeployments(results.Items);

        let paginationKey: DeploymentTaskListPaginationKey;
        if (results.LastEvaluatedKey) {
            console.log(results);
            const lastEvaluatedTaskId = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                taskId: lastEvaluatedTaskId,
            };
        }

        logger.debug(
            `deploymentTasks.dao listDeploymentsByCore: in: deployments:${JSON.stringify(
                deployments,
            )}, paginationKey: ${JSON.stringify(paginationKey)}`,
        );
        return [deployments, paginationKey];
    }

    public async listCoresByDeploymentTask(
        taskId: string,
        count?: number,
        lastEvaluated?: CoreDeploymentListPaginationKey,
    ): Promise<[Deployment[], CoreDeploymentListPaginationKey]> {
        logger.debug(
            `deploymentTasks.dao list: in: taskId:${taskId}, count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;

        if (lastEvaluated?.thingName) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.DeploymentTask, taskId),
                sk: createDelimitedAttribute(PkType.CoreDevice, lastEvaluated.thingName),
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#hash=:hash AND begins_with( #sortKey, :sortKey )`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sortKey': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.DeploymentTask, taskId),
                ':sortKey': createDelimitedAttribute(PkType.CoreDevice),
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('deploymentTasks.dao listCoresByDeploymentTask: exit: undefined');
            return [[], undefined];
        }

        const deployments = this.assembleDeployments(results.Items);

        let paginationKey: CoreDeploymentListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedThingName = expandDelimitedAttribute(
                results.LastEvaluatedKey.sk,
            )[1];
            paginationKey = {
                thingName: lastEvaluatedThingName,
            };
        }

        logger.debug(
            `deploymentTasks.dao listCoresByDeploymentTask: in: deployments:${JSON.stringify(
                deployments,
            )}, paginationKey: ${JSON.stringify(paginationKey)}`,
        );
        return [deployments, paginationKey];
    }

    public async list(
        count?: number,
        lastEvaluated?: DeploymentTaskListPaginationKey,
    ): Promise<[DeploymentTask[], DeploymentTaskListPaginationKey]> {
        logger.debug(
            `deploymentTasks.dao list: in: count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (lastEvaluated?.taskId) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.DeploymentTask, lastEvaluated.taskId),
                sk: createDelimitedAttribute(PkType.DeploymentTask, lastEvaluated.taskId),
                siKey1: PkType.DeploymentTask,
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
                ':hash': PkType.DeploymentTask,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('deploymentTasks.dao list: exit: undefined');
            return [undefined, undefined];
        }

        const deploymentTaskList = this.assembleList(results.Items);

        let paginationKey: DeploymentTaskListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedTaskId = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                taskId: lastEvaluatedTaskId,
            };
        }

        logger.debug(
            `templates.dao list: exit: response:${JSON.stringify(
                deploymentTaskList,
            )}, paginationKey:${paginationKey}`,
        );

        return [deploymentTaskList, paginationKey];
    }

    public async get(taskId: string, summarize = false): Promise<DeploymentTask> {
        logger.debug(`deploymentTasks.dao get: in: taskId:${taskId}, summarize:${summarize}`);

        const taskDbId = createDelimitedAttribute(PkType.DeploymentTask, taskId);

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

        // TODO: either handle pagination of targeted cores, or expose as a different paginated endpoint
        const results = await this.dbc.send(new QueryCommand(params));
        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('deploymentTasks.dao get: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items);
        logger.debug(`deploymentTasks.dao get: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async saveDeploymentTask(
        task: DeploymentTask,
        saveBatchProgress: boolean,
    ): Promise<void> {
        logger.debug(
            `deploymentTasks.dao saveDeploymentTask: in: task:${JSON.stringify(
                task,
            )}, saveBatchProgress:${saveBatchProgress}`,
        );

        ow(task, ow.object.nonEmpty);
        ow(task.id, ow.string.nonEmpty);
        ow(task.taskStatus, ow.string.nonEmpty);
        for (const d of task.deployments) {
            ow(d, ow.object.nonEmpty);
            ow(d.coreName, ow.string.nonEmpty);
        }

        const params: BatchWriteCommandInput = {
            RequestItems: {
                [process.env.AWS_DYNAMODB_TABLE_NAME]: [],
            },
        };

        const createdAt = task.createdAt ? new Date(task.createdAt).toISOString() : undefined;
        const updatedAt = task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined;

        // main task item
        const taskDbId = createDelimitedAttribute(PkType.DeploymentTask, task.id);
        const taskItem = {
            PutRequest: {
                Item: {
                    pk: taskDbId,
                    sk: taskDbId,
                    siKey1: PkType.DeploymentTask,
                    templateName: task.template.name,
                    templateVersion: task.template.version,
                    targets: task.targets,
                    iotJobConfig: task.iotJobConfig,
                    taskId: task.id,
                    taskStatus: task.taskStatus,
                    statusMessage: task.statusMessage,
                    createdAt: createdAt,
                    updatedAt: updatedAt,
                },
            },
        };
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(taskItem);

        // batch processing status item
        if (task.batchesTotal > 0 && saveBatchProgress) {
            const batchDbId = createDelimitedAttribute(PkType.DeploymentTask, task.id, 'batches');
            const batchSummaryItem = {
                PutRequest: {
                    Item: {
                        pk: taskDbId,
                        sk: batchDbId,
                        batchesTotal: task.batchesTotal,
                        batchesComplete: task.batchesComplete,
                        createdAt: createdAt,
                        updatedAt: updatedAt,
                    },
                },
            };
            params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(batchSummaryItem);
        }

        if ((task.deployments?.length ?? 0) > 0) {
            for (const d of task.deployments) {
                // deployment task detail item
                const coreDbId = createDelimitedAttribute(PkType.CoreDevice, d.coreName);
                const deploymentTaskDetailItem = {
                    PutRequest: {
                        Item: {
                            pk: taskDbId,
                            sk: coreDbId,
                            siKey1: coreDbId, //This is so that we can query deploymnents based on corename
                            name: d.coreName,
                            taskStatus: d.taskStatus,
                            statusMessage: d.statusMessage,
                            createdAt: createdAt,
                            updatedAt: updatedAt,
                        },
                    },
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(
                    deploymentTaskDetailItem,
                );
            }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_DEPLOYMENT_TASK_FAILED');
        }

        logger.debug(`deploymentTasks.dao saveDeploymentTask: exit:`);
    }

    public async getDeploymentIdByJobId(jobId: string): Promise<string> {
        logger.debug(`deploymentTasks.dao getDeploymentIdByJobId: in: jobId:${jobId}`);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI3_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey3',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.IotJob, jobId),
            },
        };

        logger.silly(
            `deploymentTasks.dao getDeploymentIdByJobId: QueryInput: ${JSON.stringify(params)}`,
        );

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao getTemplateIdByJobId: exit: undefined');
            return undefined;
        }

        logger.silly(`query result: ${JSON.stringify(results)}`);
        const deploymentId: string = expandDelimitedAttribute(results.Items[0]?.siSort3)[1];

        logger.debug(`templates.dao getDeploymentIdByJobId: exit: ${deploymentId}`);
        return deploymentId;
    }

    public async saveTaskDetail(taskId: string, deployment: Deployment): Promise<void> {
        logger.debug(
            `deploymentTasks.dao saveTaskDetail: in: taskId:${taskId}, deployment:${JSON.stringify(
                deployment,
            )}`,
        );

        ow(taskId, ow.string.nonEmpty);
        ow(deployment, ow.object.nonEmpty);

        // deployment task detail item
        const taskDbId = createDelimitedAttribute(PkType.DeploymentTask, taskId);
        const coreDbId = createDelimitedAttribute(PkType.CoreDevice, deployment.coreName);
        const createdAt = deployment.createdAt
            ? new Date(deployment.createdAt).toISOString()
            : undefined;
        const updatedAt = deployment.updatedAt
            ? new Date(deployment.updatedAt).toISOString()
            : undefined;
        const deploymentTaskDetailItem: PutCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Item: {
                pk: taskDbId,
                sk: coreDbId,
                name: deployment.coreName,
                taskStatus: deployment.taskStatus,
                statusMessage: deployment.statusMessage,
                createdAt: createdAt,
                updatedAt: updatedAt,
            },
        };

        await this.dbc.send(new PutCommand(deploymentTaskDetailItem));

        logger.debug(`deploymentTasks.dao saveTaskDetail: exit:`);
    }

    public async incrementBatchesCompleted(taskId: string): Promise<TaskBatchProgress> {
        logger.debug(`deploymentTasks.dao incrementBatchProgress: in: taskId:${taskId}`);

        // validation
        ow(taskId, ow.string.nonEmpty);

        const taskDbId = createDelimitedAttribute(PkType.DeploymentTask, taskId);
        const batchDbId = createDelimitedAttribute(PkType.DeploymentTask, taskId, 'batches');

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
        logger.debug(
            `deploymentTasks.dao incrementBatchProgress: exit: ${JSON.stringify(response)}`,
        );
        return response;
    }

    private assembleList(items: DocumentDbClientItem[]): DeploymentTask[] {
        logger.debug(`deploymentTasks.dao assembleList: items:${JSON.stringify(items)}`);

        const deploymentTaskList: DeploymentTask[] = [];

        for (const item of items) {
            const deploymentTask = this.assemble([item]);
            deploymentTaskList.push(deploymentTask);
        }

        logger.debug(
            `deploymentTasks.dao assembleList: response:${JSON.stringify(deploymentTaskList)}`,
        );

        return deploymentTaskList;
    }

    private assembleDeployments(items: DocumentDbClientItem[]): Deployment[] {
        logger.debug(`deploymentTasks.dao assembleDeployments: items:${JSON.stringify(items)}`);

        const deployments: Deployment[] = [];

        items.forEach((item) => {
            const deployment = this.assembleDeployment(item);
            if (deployment) {
                deployments.push(deployment);
            }
        });

        logger.debug(
            `deploymentTasks.dao assembleDeployments: deployments:${JSON.stringify(deployments)}`,
        );
        return deployments;
    }

    private assembleDeployment(item: DocumentDbClientItem): Deployment {
        logger.debug(`deploymentTasks.dao assembleDeployment: item:${JSON.stringify(item)}`);

        const sk = expandDelimitedAttribute(item.sk);
        let deployment;
        if (sk.length === 2 && sk[0] === PkType.CoreDevice) {
            deployment = {
                coreName: item.name,
                taskId: item.taskId,
                taskStatus: item.taskStatus,
                statusMessage: item.statusMessage,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt),
            };
        }

        logger.debug(`deploymentTasks.dao assembleDeployment: exit:${JSON.stringify(deployment)}`);

        return deployment;
    }

    private assemble(items: DocumentDbClientItem[]): DeploymentTask {
        logger.debug(`deploymentTasks.dao assemble: items:${JSON.stringify(items)}`);
        if ((items?.length ?? 0) === 0) {
            return undefined;
        }

        let t: DeploymentTask;
        const d: Deployment[] = [];
        items.forEach((item) => {
            const sk = expandDelimitedAttribute(item.sk);
            if (sk.length === 2 && sk[0] === PkType.DeploymentTask && item.sk === item.pk) {
                // deployment task main item
                t = {
                    id: item.taskId,
                    template: {
                        name: item.templateName,
                        version: item.templateVersion,
                    },
                    targets: item.targets,
                    iotJobConfig: item.iotJobConfig,
                    deployments: [],
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                };
            } else if (sk.length === 3 && sk[2] === 'batches') {
                // batch progress
                t.batchesComplete = item.batchesComplete;
                t.batchesTotal = item.batchesTotal;
            } else if (sk.length === 2 && sk[0] === PkType.CoreDevice) {
                // core device
                d.push({
                    coreName: item.name,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                });
            } else {
                logger.warn(`deploymentTasks.dao assemble: ignoring item:${JSON.stringify(item)}`);
            }
        });
        t.deployments = d;
        logger.debug(`deploymentTasks.dao assemble: exit:${JSON.stringify(t)}`);
        return t;
    }
}

export interface TaskBatchProgress {
    complete: number;
    total: number;
}

export type DeploymentTaskListPaginationKey = {
    taskId: string;
};

export type CoreDeploymentListPaginationKey = {
    thingName: string;
};
