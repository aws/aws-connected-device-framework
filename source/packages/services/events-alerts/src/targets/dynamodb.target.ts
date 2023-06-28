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
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import { TYPES } from '../di/types';
import { DynamoDbTargetDao } from './dynamoDb.target.dao';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class DynamoDBTarget {

    public constructor(
        @inject(TYPES.DynamoDbTargetDao) private ddbTargetDao: DynamoDbTargetDao) {
    }

    public async writeAlert(item: unknown, targetTableName: string) : Promise<void>{
        logger.debug(`Dynamodb.target writeAlert: in: targetTableName:${targetTableName}, item:${JSON.stringify(item)}`);

        // validate input
        ow(targetTableName, ow.string.nonEmpty);
        ow(item, ow.object.nonEmpty);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };
        const alert = {
            PutRequest: {
                Item: item
            }
        };

        params.RequestItems[targetTableName]=[alert];

        const result = await this.ddbTargetDao.batchWriteAll(params);
        if (this.ddbTargetDao.hasUnprocessedItems(result)) {
            throw new Error('Could not write to target table');
        }
        logger.debug(`Dynamodb.target writeAlert: exit:`);
    }
}

export type DynamoDbRecord = {[key: string]: string};
