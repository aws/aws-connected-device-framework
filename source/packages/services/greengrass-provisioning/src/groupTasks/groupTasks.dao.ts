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
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import { GroupTaskSummaryItem } from './groupTasks.models';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { createDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import ow from 'ow';
import { GroupItem } from '../groups/groups.models';

@injectable()
export class GroupTasksDao {

    private readonly SI2_INDEX = 'si2Hash-sk-index';

    private dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private tableName:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(task:GroupTaskSummaryItem) : Promise<void> {
        logger.debug(`groupTasks.dao save: in: task:${JSON.stringify(task)}`);

        // validation
        ow(task, ow.object.nonEmpty);
        ow(task.taskStatus, ow.string.nonEmpty);
        ow(task.groups, ow.array.minLength(1));
        for(const group of task.groups) {
            ow(group, ow.object.nonEmpty);
            ow(group.name, ow.string.nonEmpty);
        }

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        // main task record
        const taskDbId =  createDelimitedAttribute(PkType.GreengrassGroupTask, task.taskId);
        const summaryRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: taskDbId,
                    sk:  taskDbId,
                    si2Hash: taskDbId,
                    
                    taskType: task.type,
                    taskStatus: task.taskStatus,
                    createdAt: task.createdAt?.toISOString(),
                    updatedAt: task.updatedAt?.toISOString()
                }
            }
        };
        params.RequestItems[this.tableName].push(summaryRecord);

        // batch processing status record
        if (task.batchesTotal>0) {
            const batchDbId =  createDelimitedAttribute(PkType.GreengrassGroupTask, task.taskId, 'batches');
            const batchRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: taskDbId,
                        sk:  batchDbId,
                        si2Hash: taskDbId,
                        batchesTotal: task.batchesTotal,
                        batchesComplete: task.batchesComplete,
                        createdAt: task.createdAt?.toISOString(),
                        updatedAt: task.updatedAt?.toISOString()
                    }
                }
            };
            params.RequestItems[this.tableName].push(batchRecord);
        }

        // skeleton record for each group to represent task status
        for(const group of task.groups) {
            const groupDbId = createDelimitedAttribute(PkType.GreengrassGroup, group.name);
            const groupRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: groupDbId,
                        sk:  taskDbId,
                        si2Hash: taskDbId,

                        id: group.id,
                        versionId: group.versionId,
                        versionNo: group.versionNo,
                        arn: group.arn,
                        templateName: group.templateName,
                        templateVersionNo: group.templateVersionNo,
                        taskStatus: group.taskStatus,
                        statusMessage: group.statusMessage,

                        createdAt: task.createdAt?.toISOString(),
                        updatedAt: task.updatedAt?.toISOString()
                    }
                }
            };
            params.RequestItems[this.tableName].push(groupRecord);
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`groupTasks.dao save: exit:`);
    }

    public async incrementBatchesCompleted(taskId:string ) : Promise<TaskBatchProgress> {
        logger.debug(`groupTasks.dao incrementBatchProgress: in: taskId:${taskId}`);

        // validation
        ow(taskId, ow.string.nonEmpty);

        const taskDbId =  createDelimitedAttribute(PkType.GreengrassGroupTask, taskId);
        const batchDbId =  createDelimitedAttribute(PkType.GreengrassGroupTask, taskId, 'batches');
        
        const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: this.tableName,
            Key: {
                pk: taskDbId,
                sk: batchDbId
            },
            UpdateExpression: 'set batchesComplete = batchesComplete + :val',
            ExpressionAttributeValues:{
                ':val': 1
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await this.dc.update(params).promise();
        const response:TaskBatchProgress = {
            complete: result.Attributes['batchesComplete'],
            total: result.Attributes['batchesTotal']
        };
        logger.debug(`groupTasks.dao incrementBatchProgress: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async get(taskId:string, summary=false) : Promise<GroupTaskSummaryItem> {
        logger.debug(`groupTasks.dao get: in: taskId:${taskId}, summary:${summary}`);

        const taskDbId =  createDelimitedAttribute(PkType.GreengrassGroupTask, taskId);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: this.SI2_INDEX,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'si2Hash'
            },
            ExpressionAttributeValues: {
                ':pk': taskDbId
            },
            ScanIndexForward: true
        };

        if (summary) {
            // only return the summary record if the summary is all we need
            params.KeyConditionExpression+=' AND #sk=:sk';
            params.ExpressionAttributeNames['#sk'] = 'sk';
            params.ExpressionAttributeValues[':sk'] = taskDbId;
        }

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('groupTasks.dao get: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items);
        logger.debug(`groupTasks.dao get: exit: ${JSON.stringify(task)}`);
        return task;
    }

    private assemble(results:AWS.DynamoDB.DocumentClient.ItemList) : GroupTaskSummaryItem {
        logger.debug(`groupTasks.dao assemble: in: results: ${JSON.stringify(results)}`);

        const task:GroupTaskSummaryItem= {
            taskId: undefined,
            taskStatus: undefined,
            groups: undefined
        };
        task.groups= [];

        for(const i of results) {

            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');

            if (pkElements.length===2 && pkElements[0]===PkType.GreengrassGroupTask && skElements.length===2 && skElements[0]===PkType.GreengrassGroupTask) {
                // task item
                task.taskId = pkElements[1];
                task.taskStatus = i.taskStatus;
                task.type = i.taskType;
                task.createdAt = new Date(i.createdAt);
                task.updatedAt = new Date(i.updatedAt);
            } else if (skElements.length===3 && skElements[0]===PkType.GreengrassGroupTask && skElements[2]==='batches') {
                // add task batch progress
                task.batchesTotal = i.batchesTotal;
                task.batchesComplete = i.batchesComplete;
            } else if (pkElements.length===2 && pkElements[0]===PkType.GreengrassGroup && skElements.length===2 && skElements[0]===PkType.GreengrassGroupTask) {
                const item = new GroupItem();
                item.name = pkElements[1];
                item.id = i.id;
                item.versionId = i.versionId;
                item.versionNo = i.versionNo;
                item.arn = i.arn;
                item.templateName = i.templateName;
                item.templateVersionNo = i.templateVersionNo;
                item.taskStatus = i.taskStatus;
                item.statusMessage = i.statusMessage;
                item.createdAt = new Date(i.createdAt);
                item.updatedAt = new Date(i.updatedAt);
                task.groups.push(item);
            } else {
                logger.warn(`groupTasks.dao assemble: skipping pk: ${i.pk}, sk: ${i.sk} as not recognized`);
            }
        }

        logger.debug(`groupTasks.dao assemble: exit: ${JSON.stringify(task)}`);
        return task;
    }

}

export interface TaskBatchProgress {
    complete:number;
    total:number;
}
