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
import { SubscriptionItem } from '../api/subscriptions/subscription.models';

@injectable()
export class AlertDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
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
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.Subscription, alert.subscription.id),
                        time: alert.time,
                        eventId: alert.event.id,
                        eventName: alert.event.name,
                        userId: alert.user.id,
                        targets: alert.targets,
                        gsi2Sort: createDelimitedAttribute(PkType.Event, alert.event.id, alert.time),
                        principal: alert.eventSource.principal,
                        principalValue: alert.subscription.principalValue
                    }
                }
            };

            if (alert.sns!==undefined) {
                dbItem.PutRequest.Item['snsTopicArn']=alert.sns.topicArn;
            }

            params.RequestItems[this.eventNotificationsTable].push(dbItem);

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

    public async updateChangedSubAlertStatus(newSubAlertStatus:{[key:string]:SubscriptionItem}):Promise<void> {
        logger.debug(`alert.dao updateChangedSubAlertStatus: in: newSubAlertStatus:${JSON.stringify(newSubAlertStatus)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.eventConfigTable]= [];

        // TODO handle max batch size of 25 items (split into smaller chunks)

        for(const subId of Object.keys(newSubAlertStatus)) {  
            const si=newSubAlertStatus[subId];
            if (si.alerted===true)   {
                params.RequestItems[this.eventConfigTable].push({
                    PutRequest: {
                        Item: {
                            pk: createDelimitedAttribute(PkType.Subscription, subId),
                            sk: 'alertStatus',
                            alerted: true,
                            gsi2Key: createDelimitedAttribute(PkType.EventSource, si.eventSource.id, si.eventSource.principal, si.principalValue),
                            gsi2Sort: createDelimitedAttribute(PkType.Subscription, subId)
                        }
                    }
                });
            } else {
                params.RequestItems[this.eventConfigTable].push({
                    DeleteRequest: {
                        Key: {
                            pk: createDelimitedAttribute(PkType.Subscription, subId),
                            sk: 'alertStatus'
                        }
                    }
                });
            }
        }

        logger.debug(`alert.dao updateChangedSubAlertStatus: params:${JSON.stringify(params)}`);
        await this._dc.batchWrite(params).promise();

        // TODO: handle unprocessed


        logger.debug('alert.dao updateChangedSubAlertStatus: exit:');
    }

}
