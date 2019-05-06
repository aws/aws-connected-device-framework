/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable,inject } from 'inversify';
import {logger} from '../utils/logger';
import AWS = require('aws-sdk');
import { TYPES } from '../di/types';
import ow from 'ow';
import { DynamoDB } from 'aws-sdk';
import { TaskStatus } from './certificatestask.models';

@injectable()
export class CertificatesDao {

    private _dynamodb: AWS.DynamoDB;

    public constructor(@inject(TYPES.DynamoDBFactory) dynamoFactory: () => AWS.DynamoDB,
                       @inject('aws.dynamodb.tasks.tableName') private tasksTable: string) {
        this._dynamodb = dynamoFactory();
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
