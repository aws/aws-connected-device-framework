/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { TYPES } from '../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PkType, createDelimitedAttributePrefix } from '../utils/pkUtils';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { FilterItem } from './filter.models';

@injectable()
export class FilterDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi3') private eventConfigGSI3:string,
        @inject('aws.dynamoDb.tables.eventConfig.partitions') private eventConfigPartitions:number,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async listSubscriptions(eventSourceId:string, principal:string): Promise<FilterItem[]> {
        logger.debug('filter.dao get: list:');

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI3,
            KeyConditionExpression: `#gsiBucket BETWEEN :gsiBucketFrom AND :gsiBucketTo AND begins_with(#gsi3Sort, :gsi3Sort)`,
            ExpressionAttributeNames: {
                '#gsiBucket': 'gsiBucket',
                '#gsi3Sort': 'gsi3Sort'
            },
            ExpressionAttributeValues: {
                ':gsiBucketFrom': 0,
                ':gsiBucketTo': this.eventConfigPartitions,
                ':gsi3Sort': createDelimitedAttributePrefix(PkType.EventSource, eventSourceId, principal )
            }

        };

        logger.debug(`filter.dao list: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('filter.dao list: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        *****************  TODO: build FilterItems by combining the subscription and event record

        const filters:{ [subscriptionId:string] : FilterItem} = {};
        for(const i of results.Items) {
            const subscriptionId = i['pk'];

            Object.keys(i).forEach( key => {
                r[key] = i[key];
            });

            response.push(r);
        }

        logger.debug(`filter.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

}
