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
import { TYPES } from '../di/types';
import { AlertItem } from './alert.models';
import { logger } from '@awssolutions/simple-cdf-logger';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { createDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { DynamoDbUtils } from '../utils/dynamoDb.util';

@injectable()
export class AlertDao {
    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable: string,
        @inject('aws.dynamoDb.tables.eventNotifications.name')
        private eventNotificationsTable: string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
    ) {}

    public async create(alerts: AlertItem[]): Promise<void> {
        logger.debug(`alert.dao create: in: alerts:${JSON.stringify(alerts)}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.eventNotificationsTable] = [];

        for (const alert of alerts) {
            const dbItem = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.Subscription, alert.subscription.id),
                        time: alert.time,
                        eventId: alert.event.id,
                        eventName: alert.event.name,
                        userId: alert.user.id,
                        targets: alert.targets,
                        gsi2Sort: createDelimitedAttribute(
                            PkType.Event,
                            alert.event.id,
                            alert.time,
                        ),
                        principal: alert.eventSource.principal,
                        principalValue: alert.subscription.principalValue,
                        templatePropertiesData: alert.templatePropertiesData,
                        version: alert.version,
                    },
                },
            };

            if (alert.sns !== undefined) {
                dbItem.PutRequest.Item['snsTopicArn'] = alert.sns.topicArn;
            }

            params.RequestItems[this.eventNotificationsTable].push(dbItem);
        }

        const unprocessed = await this.dynamoDbUtils.batchWriteAll(params);
        if (unprocessed !== undefined && unprocessed) {
            throw new Error('CREATE_ALERTS_FAILED');
        }

        logger.debug('alert.dao create: exit:');
    }

    public async updateChangedSubAlertStatus(newSubAlertStatus: {
        [key: string]: SubscriptionItem;
    }): Promise<void> {
        logger.debug(
            `alert.dao updateChangedSubAlertStatus: in: newSubAlertStatus:${JSON.stringify(
                newSubAlertStatus,
            )}`,
        );

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.eventConfigTable] = [];

        for (const subId of Object.keys(newSubAlertStatus)) {
            const si = newSubAlertStatus[subId];
            if (si.alerted === true) {
                params.RequestItems[this.eventConfigTable].push({
                    PutRequest: {
                        Item: {
                            pk: createDelimitedAttribute(PkType.Subscription, subId),
                            sk: 'alertStatus',
                            alerted: true,
                            gsi2Key: createDelimitedAttribute(
                                PkType.EventSource,
                                si.eventSource.id,
                                si.eventSource.principal,
                                si.principalValue,
                            ),
                            gsi2Sort: createDelimitedAttribute(PkType.Subscription, subId),
                        },
                    },
                });
            } else {
                params.RequestItems[this.eventConfigTable].push({
                    DeleteRequest: {
                        Key: {
                            pk: createDelimitedAttribute(PkType.Subscription, subId),
                            sk: 'alertStatus',
                        },
                    },
                });
            }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('UPDATE_SUBSCRIPTIONS_FAILED');
        }

        logger.debug('alert.dao updateChangedSubAlertStatus: exit:');
    }
}
