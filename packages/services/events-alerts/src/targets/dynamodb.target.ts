
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { logger } from '../utils/logger.util';
import ow from 'ow';
import { TYPES } from '../di/types';
import { DynamoDbTargetDao } from './dynamoDb.target.dao';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class DynamoDBTarget {

    public constructor(
        @inject(TYPES.DynamoDbTargetDao) private ddbTargetDao: DynamoDbTargetDao) {
    }

    public async writeAlert(item: any, targetTableName: string) {
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
