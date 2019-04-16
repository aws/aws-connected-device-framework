/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import AWS = require('aws-sdk');
import { TYPES } from '../di/types';
import ow from 'ow';
import { CertificateBatchTaskWithChunks, TaskStatus } from './certificatestask.models';
import { DynamoDB } from 'aws-sdk';

@injectable()
export class CertificatesTaskDao {

    private _dynamodb: AWS.DynamoDB;

    public constructor(@inject('aws.dynamodb.tasks.tableName') private tasksTable: string,
                        @inject(TYPES.DynamoDBFactory) dynamoFactory: () => AWS.DynamoDB) {
        this._dynamodb = dynamoFactory();
    }

    /**
     * write batch data to DynamoDB with quantity and taskID-chunkId mapping
     */
    public async saveChunk(taskID:string, chunkID:number, quantity:number, status:string, batchDateInMs:number) : Promise<void> {
        logger.debug(`certificatestask.dao saveChunk: in: taskID:${taskID}, chunkID:${chunkID}, quantity:${quantity}, status:${status}, batchDateInMs:${batchDateInMs}`);

        ow(taskID, ow.string.nonEmpty);
        ow(chunkID, ow.number.greaterThan(0));
        ow(quantity, ow.number.greaterThan(0));
        ow(status, ow.string.nonEmpty);
        ow(batchDateInMs, ow.number.greaterThan(0));

        const params:DynamoDB.Types.PutItemInput = {
            Item: {
                'taskId': {
                    S: taskID
                },
                'chunkId': {
                    N: `${chunkID}`
                },
                'quantity': {
                    N: `${quantity}`
                },
                'status': {
                    S: status
                },
                'batchDate': {
                    N: batchDateInMs.toString()
                }
            },
            TableName: this.tasksTable
        };

        await this._dynamodb.putItem(params).promise();
        logger.debug('certificatestask.dao saveChunk: exit:');
    }

    /**
     * updates DynamoDB to mark status as completed
     */
    public async updateTaskChunkLocation(taskID:string, chunkID:number, location:string) : Promise<void> {
        logger.debug(`certificatestask.service updateTaskChunkLocation: in: taskID:${taskID}, chunkID:${chunkID}, location:${location}`);

        ow(taskID, ow.string.nonEmpty);
        ow(chunkID, ow.number.greaterThan(0));
        ow(location, ow.string.nonEmpty);

        const params = {
            ExpressionAttributeNames: {
                '#ST': 'status',
                '#L': 'location'
            },
            ExpressionAttributeValues: {
                ':st': {
                    S: 'completed'
                },
                ':l': {
                    S: location
                }
            },
            Key: {
                'taskId': {
                    S: taskID
                },
                'chunkId': {
                    N: `${chunkID}`
                }
            },
            TableName: this.tasksTable,
            UpdateExpression: 'SET #L = :l, #ST = :st'
        };
        await this._dynamodb.updateItem(params).promise();
        logger.debug('certificatestask.service updateTaskChunkLocation: exit:');
    }

    /**
     * queries DynamoDB with taskId
     */
    public async getTask(taskId:string) : Promise<CertificateBatchTaskWithChunks> {
        logger.debug(`certificatestask.service getTask: in: taskID:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        const params = {
            ExpressionAttributeNames: {
                '#st': 'status',
                '#bd': 'batchDate'
            },
            ExpressionAttributeValues: {
                ':a': {
                            S: taskId
                    }
                },
            KeyConditionExpression: 'taskId = :a',
            ProjectionExpression: '#st,#bd',
            TableName: this.tasksTable
        };
        const data = await this._dynamodb.query(params).promise();
        const Items = data.Items;
        logger.debug(`certificatestask.service getTask: Items: ${JSON.stringify(Items)}`);
        if (Items.length === 0) {
            // task not present in Dynamo
            logger.debug('certificatestask.service getTask: exit: undefined');
            return undefined;
        }
        const batchDate = Number(data.Items[0].batchDate.N);
        let chunksPending = 0;
        let chunksTotal = 0;
        for (const i of Items) {
            const status = i.status.S;
            if (status === TaskStatus.PENDING) {
                chunksTotal++;
                chunksPending++;
            } else {
                chunksTotal++;
            }
        }

        let task:CertificateBatchTaskWithChunks;
        if (chunksPending !== 0) {
            task = {
                taskId,
                batchDate,
                status: TaskStatus.PENDING,
                chunksPending,
                chunksTotal
            };
        } else {
            task = {
                taskId,
                batchDate,
                status: TaskStatus.COMPLETE,
                chunksPending: 0,
                chunksTotal
            };
        }
        logger.debug(`certificatestask.service getTask: exit: ${JSON.stringify(task)}`);
        return task;
    }

    /**
     * queries DynamoDB with taskId
     */
    public async getTaskLocations(taskID:string) : Promise<string[]> {
        logger.debug(`bulkcertificates.dao getTaskLocations: in: taskId:${taskID}`);

        ow(taskID, ow.string.nonEmpty);

        const params:DynamoDB.Types.QueryInput = {
            ExpressionAttributeNames: {
                '#st': 'status',
                '#l': 'location'
            },
            ExpressionAttributeValues: {
                ':a': {
                            S: taskID
                    }
                },
            KeyConditionExpression: 'taskId = :a',
            ProjectionExpression: '#st, #l',
            TableName: this.tasksTable
        };
        const data = await this._dynamodb.query(params).promise();

        const s3_loc = [];
        const Items = data.Items;
        for (const i of Items) {
            const status:string = i.status.S;
            if (status === TaskStatus.PENDING) {
                // no locations yet if pending
                logger.debug('bulkcertificates.dao getTaskLocations: exit: undefined');
                return undefined;
            }
            const location:string = i.location.S;
            s3_loc.push(location);
        }
        logger.debug(`bulkcertificates.dao getTaskLocations: exit:${s3_loc}`);
        return s3_loc;
    }

}
