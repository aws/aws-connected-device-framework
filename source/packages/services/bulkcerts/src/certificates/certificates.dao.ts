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
import { injectable,inject } from 'inversify';
import {logger} from '@awssolutions/simple-cdf-logger';
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
