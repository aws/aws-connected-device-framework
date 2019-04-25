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
import { createDelimitedAttribute, PkType, expandDelimitedAttribute, isPkType } from '../../utils/pkUtils';

@injectable()
export class SubscriptionDao {

    private _dc: AWS.DynamoDB.DocumentClient;
    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi2') private eventConfigGSI2:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient,
	    @inject(TYPES.CachableDocumentClientFactory) cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
        this._cachedDc = cachableDocumentClientFactory();
    }

    /**
     * Creates the Subscription DynamoDB items:
     *   pk='S-{subscriptionId}, sk='S-{subscriptionId}'
     *   pk='S-{subscriptionId}, sk='E-{eventId}'
     *   pk='S-{subscriptionId}, sk='U-{userId}').
     * @param subscription
     */
    public async create(si:SubscriptionItem): Promise<void> {
        logger.debug(`subscription.dao create: in: si:${JSON.stringify(si)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const subscriptionDbId = createDelimitedAttribute(PkType.Subscription, si.id);
        const gsi1Sort = createDelimitedAttribute(PkType.Subscription, si.enabled, si.id);
        const gsi2Key = createDelimitedAttribute(PkType.EventSource, si.eventSource.id, si.eventSource.principal, si.principalValue);

        const subscriptionCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: subscriptionDbId,
                    gsi1Sort,
                    principalValue: si.principalValue,
                    ruleParameterValues: si.ruleParameterValues,
                    enabled: si.enabled,
                    alerted: si.alerted,
                    gsi2Key,
                    gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id)
                }
            }
        };

        const eventCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: createDelimitedAttribute(PkType.Event, si.event.id),
                    name: si.event.name,
                    conditions: si.event.conditions,
                    principal: si.eventSource.principal,
                    eventSourceId: si.eventSource.id,
                    gsi2Key,
                    gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id, PkType.Event, si.event.id)
                }
            }
        };

        const userCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: createDelimitedAttribute(PkType.User, si.user.id),
                    gsi1Sort: createDelimitedAttribute(PkType.Subscription, si.enabled, si.id),
                    gsi2Key,
                    gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id, PkType.User, si.user.id)
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[subscriptionCreate, eventCreate, userCreate];

        if (si.targets) {
            if (si.targets.sns) {
                params.RequestItems[this.eventConfigTable].push({
                    PutRequest: {
                        Item: {
                            pk: subscriptionDbId,
                            sk: createDelimitedAttribute(PkType.SubscriptionTarget, 'sns'),
                            gsi2Key,
                            gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id, PkType.SubscriptionTarget, 'sns'),
                            arn: si.targets.sns.arn
                        }
                    }
                });
            }
            if (si.targets.iotCore) {
                params.RequestItems[this.eventConfigTable].push({
                    PutRequest: {
                        Item: {
                            pk: subscriptionDbId,
                            sk: createDelimitedAttribute(PkType.SubscriptionTarget, 'iotCore'),
                            gsi2Key,
                            gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id, PkType.SubscriptionTarget, 'iotCore'),
                            topic: si.targets.iotCore.topic
                        }
                    }
                });
            }
        }

        logger.debug(`subscription.dao create: params:${JSON.stringify(params)}`);
        let response = await this._dc.batchWrite(params).promise();

        if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
            logger.warn(`subscription.dao create: the following items failed writing, attempting again:\n${JSON.stringify(response.UnprocessedItems)}`);

            const retryParams: DocumentClient.BatchWriteItemInput = {
                RequestItems: response.UnprocessedItems
            };
            response = await this._dc.batchWrite(retryParams).promise();

            if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
                logger.error(`subscription.dao create: the following items failed writing:\n${JSON.stringify(response.UnprocessedItems)}`);
                throw new Error('FAILED_SAVING_SUBSCRIPTION');
            }
        }

        logger.debug(`subscriptions.dao create: exit:`);
    }

    public async listSubscriptionsForEventMessage(eventSourceId:string, principal:string, principalValue:string): Promise<SubscriptionItem[]> {
        logger.debug(`subscription.dao listSubscriptionsForEventMessage: eventSourceId:${eventSourceId}, principal:${principal}, principalValue:${principalValue}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI2,
            KeyConditionExpression: `#key = :value`,
            ExpressionAttributeNames: {
                '#key': 'gsi2Key'
            },
            ExpressionAttributeValues: {
                ':value': createDelimitedAttribute(PkType.EventSource, eventSourceId, principal, principalValue )
            }
        };

        // logger.debug(`subscription.dao listSubscriptionsForEventMessage: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao listSubscriptionsForEventMessage: exit: undefined');
            return undefined;
        }

        // logger.debug(`subscription.dao listSubscriptionsForEventMessage: query result: ${JSON.stringify(results)}`);

        const subscriptions:{[subscriptionId:string] : SubscriptionItem}= {};
        for(const i of results.Items) {

            const subscriptionId = expandDelimitedAttribute(i['pk'])[1];
            let s = subscriptions[subscriptionId];
            if (s===undefined) {
                s = {
                    id: subscriptionId
                };
            }

            const sk = <string>i['sk'];

            if (isPkType(sk,PkType.Subscription)) {
                s.principalValue = i['principalValue'];
                s.ruleParameterValues = i['ruleParameterValues'];
                s.enabled = i['enabled'];
                s.alerted = i['alerted'];
            } else if (isPkType(sk,PkType.Event)) {
                s.event = {
                    id: expandDelimitedAttribute(sk)[1],
                    name: i['name'],
                    conditions: i['conditions']
                };
                s.eventSource = {
                    id: i['eventSourceId'],
                    principal: i['principal']
                };
            } else if (isPkType(sk, PkType.SubscriptionTarget)) {
                if (s.targets===undefined) {
                    s.targets= {};
                }
                if (sk===createDelimitedAttribute(PkType.SubscriptionTarget, 'sns')) {
                    s.targets.sns = {
                        arn: i['arn']
                    };
                } else if (sk===createDelimitedAttribute(PkType.SubscriptionTarget, 'iotCore')) {
                    s.targets.iotCore = {
                        topic: i['topic']
                    };
                }
            } else if (isPkType(sk,PkType.User)) {
                s.user = {
                    id: expandDelimitedAttribute(sk)[1]
                };
            }
            subscriptions[subscriptionId] = s;
        }

        logger.debug(`subscription.dao listSubscriptionsForEventMessage: subscriptions:${JSON.stringify(subscriptions)}`);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForEventMessage: exit:${JSON.stringify(response)}`);
        return response;
    }
}
