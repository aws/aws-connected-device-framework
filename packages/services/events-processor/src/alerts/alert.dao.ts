/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { AlertItem } from './alert.models';
import { logger } from '../utils/logger';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { createDelimitedAttribute, PkType } from '../utils/pkUtils';

@injectable()
export class AlertDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventNotifications.name') private eventNotificationsTable:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async create(alerts:AlertItem[]): Promise<void> {
        logger.debug(`alert.dao create: in: alerts:${JSON.stringify(alerts)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.eventNotificationsTable]= [];

        for(const alert of alerts) {

            const dbItem = {
                pk: createDelimitedAttribute(PkType.Subscription, alert.subscription.id),
                time: alert.time,
                eventId: alert.event.id,
                eventName: alert.event.name,
                userId: alert.user.id,
                targetTypes: <string[]>[],
                gsi2Sort: createDelimitedAttribute(PkType.Event, alert.event.id, alert.time)
            };

            if (alert.targets) {
                dbItem['targetTypes']= [];
                if (alert.targets.sns) {
                    dbItem['targetTypes'].push('sns');
                    dbItem['snsArn'] = alert.targets.sns.arn;
                }
                if (alert.targets.iotCore) {
                    dbItem['targetTypes'].push('iotCore');
                    dbItem['iotCoreTopic'] = alert.targets.iotCore.topic;
                }
            }

            params.RequestItems[this.eventNotificationsTable].push({
                PutRequest: {
                    Item: dbItem
                }
            });
        }

        logger.debug(`alert.dao create: params:${JSON.stringify(params)}`);
        let response = await this._dc.batchWrite(params).promise();

        if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
            logger.warn(`alert.dao create: the following items failed writing, attempting again:\n${JSON.stringify(response.UnprocessedItems)}`);

            const retryParams: DocumentClient.BatchWriteItemInput = {
                RequestItems: response.UnprocessedItems
            };
            response = await this._dc.batchWrite(retryParams).promise();

            if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
                logger.error(`alert.dao create: the following items failed writing:\n${JSON.stringify(response.UnprocessedItems)}`);
                throw new Error('FAILED_SAVING_ALERTS');
            }
        }

        logger.debug('alert.dao create: exit:');

    }

}
