/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger';
import { TYPES } from '../../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { SubscriptionItem } from './subscription.models';

@injectable()
export class SubscriptionDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    /**
     * Creates the Subscription DynamoDB items:
     *   pk='S-{subscriptionId}, sk='S-{subscriptionId}'
     *   pk='S-{subscriptionId}, sk='type').
     *   pk='S-{subscriptionId}, sk='U-{userId}').
     * @param subscription
     */
    public async create(subscription:SubscriptionItem, typeGsiSort:string, userGsiSk:string, userGsiSort:string): Promise<void> {
        logger.debug(`subscription.dao create: in: subscription:${JSON.stringify(subscription)}, typeGsiSort:${typeGsiSort}, userGsiSort:${userGsiSort}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const subscriptionCreate = {
            PutRequest: {
                Item: {
                    pk: subscription.pk,
                    sk: subscription.sk,
                    ruleParameterValues: subscription.ruleParameterValues,
                    enabled: subscription.enabled,
                    alerted: subscription.alerted,
                    gsiBucket: subscription.gsiBucket,
                    gsi2Sort: subscription.gsi2Sort,
                    gsi3Sort: subscription.gsi3Sort
                }
            }
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: subscription.sk,
                    sk: 'type',
                    gsi1Sort: typeGsiSort,
                }
            }
        };

        const userCreate = {
            PutRequest: {
                Item: {
                    pk: subscription.sk,
                    sk: userGsiSk,
                    gsi1Sort: typeGsiSort,
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[subscriptionCreate, typeCreate, userCreate];

        logger.debug(`subscription.dao create: params:${JSON.stringify(params)}`);
        await this._dc.batchWrite(params).promise();

        logger.debug(`subscriptions.dao create: exit:`);
    }

}
