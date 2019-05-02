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
import { createDelimitedAttribute, PkType, expandDelimitedAttribute, isPkType, createDelimitedAttributePrefix } from '../../utils/pkUtils';

type SubscriptionItemMap = {[subscriptionId:string] : SubscriptionItem};
export type PaginationKey = {[key:string]:string};

@injectable()
export class SubscriptionDao {

    private _dc: AWS.DynamoDB.DocumentClient;
    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi2') private eventConfigGSI2:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient,
	    @inject(TYPES.CachableDocumentClientFactory) cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
        this._cachedDc = cachableDocumentClientFactory();
    }

    /**
     * Creates the Subscription DynamoDB items:
     *   Subscription:  pk='S-{subscriptionId}, sk='S-{subscriptionId}'
     *   Event:         pk='S-{subscriptionId}, sk='E-{eventId}'
     *   User:          pk='S-{subscriptionId}, sk='U-{userId}')
     *   Target(s):     pk='S-{subscriptionId}, sk='ST-{target}'
     * @param subscription
     */
    public async create(si:SubscriptionItem): Promise<void> {
        logger.debug(`subscription.dao create: in: si:${JSON.stringify(si)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const subscriptionDbId = createDelimitedAttribute(PkType.Subscription, si.id);
        const gsi2Key = createDelimitedAttribute(PkType.EventSource, si.eventSource.id, si.eventSource.principal, si.principalValue);

        const subscriptionCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: subscriptionDbId,
                    gsi1Sort: createDelimitedAttribute(PkType.Event, si.event.id),
                    principalValue: si.principalValue,
                    ruleParameterValues: si.ruleParameterValues,
                    enabled: si.enabled,
                    alerted: si.alerted,
                    snsTopicArn: si.sns.topicArn,
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
                    gsi1Sort: createDelimitedAttribute(PkType.Subscription, si.id),
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
            for (const target of Object.keys(si.targets)) {
                const req = this.buildCommonTargetItem(si.id, subscriptionDbId, target, gsi2Key);
                for (const prop of Object.keys(si.targets[target])) {
                    req.PutRequest.Item[prop]= si.targets[target][prop];
                }
                params.RequestItems[this.eventConfigTable].push(req);
            }
        }

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

    private buildCommonTargetItem(subscriptionId:string, subscriptionDbId:string, target:string, gsi2Key:string, ):DocumentClient.WriteRequest {
        return {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: createDelimitedAttribute(PkType.SubscriptionTarget, target),
                    gsi2Key,
                    gsi2Sort: createDelimitedAttribute(PkType.Subscription, subscriptionId, PkType.SubscriptionTarget, target)
                }
            }
        };
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

        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao listSubscriptionsForEventMessage: exit: undefined');
            return undefined;
        }

        const subscriptions = this.assemble(results.Items);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForEventMessage: exit:${JSON.stringify(response)}`);
        return response;
    }

    public async listSubscriptionsForEvent(eventId:string, from?:PaginationKey): Promise<[SubscriptionItem[],PaginationKey]> {
        logger.debug(`subscription.dao listSubscriptionsForEvent: in: eventId:${eventId}, from:${JSON.stringify(from)}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#hash=:hash AND begins_with(#range, :range)`,
            ExpressionAttributeNames: {
                '#hash': 'sk',
                '#range': 'gsi1Sort'
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Event, eventId ),
                ':range': createDelimitedAttributePrefix(PkType.Subscription)
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: from
        };

        logger.debug(`subscription.dao listSubscriptionsForEvent: params:${JSON.stringify(params)}`);
        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao listSubscriptionsForEvent: exit: undefined');
            return undefined;
        }

        const lastEvaluatedKey = results.LastEvaluatedKey;
        const subscriptions = this.assemble(results.Items);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForEvent: exit: response${JSON.stringify(response)}, lastEvaluatedKey:${JSON.stringify(lastEvaluatedKey)}`);
        return [response,lastEvaluatedKey];
    }

    public async listSubscriptionsForUser(userId:string): Promise<SubscriptionItem[]> {
        logger.debug(`subscription.dao listSubscriptionsForUser: userId:${userId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#key=:key`,
            ExpressionAttributeNames: {
                '#key': 'sk'
            },
            ExpressionAttributeValues: {
                ':key': createDelimitedAttribute(PkType.User, userId )
            }
        };

        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao listSubscriptionsForUser: exit: undefined');
            return undefined;
        }

        const subscriptions = this.assemble(results.Items);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForUser: exit:${JSON.stringify(response)}`);
        return response;
    }

    public async get(subscriptionId:string): Promise<SubscriptionItem> {
        logger.debug(`subscription.dao get: subscriptionId:${subscriptionId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#key = :value`,
            ExpressionAttributeNames: {
                '#key': 'pk'
            },
            ExpressionAttributeValues: {
                ':value': createDelimitedAttribute(PkType.Subscription, subscriptionId )
            }
        };

        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao get: exit: undefined');
            return undefined;
        }

        const subscriptions = this.assemble(results.Items);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao get: exit:${JSON.stringify(response[0])}`);
        return response[0];
    }

    public async delete(subscriptionId:string): Promise<void> {
        logger.debug(`subscription.dao delete: subscriptionId:${subscriptionId}`);

        const queryParams:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#key = :value`,
            ExpressionAttributeNames: {
                '#key': 'pk'
            },
            ExpressionAttributeValues: {
                ':value': createDelimitedAttribute(PkType.Subscription, subscriptionId )
            }
        };

        const results = await this._cachedDc.query(queryParams).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao delete: exit: undefined');
            return undefined;
        }

        const deleteParams:DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        deleteParams.RequestItems[this.eventConfigTable]= [];

        for(const i of results.Items) {
            deleteParams.RequestItems[this.eventConfigTable].push({
                DeleteRequest: {
                    Key: {
                        pk: i.pk,
                        sk: i.sk
                    }
                }
            });
        }

        await this._dc.batchWrite(deleteParams).promise();

        logger.debug(`subscription.dao delete: exit:`);
    }

    private assemble(results:AWS.DynamoDB.DocumentClient.ItemList) : SubscriptionItemMap {
        logger.debug(`subscription.dao assemble: items: ${JSON.stringify(results)}`);

        const subscriptions:SubscriptionItemMap= {};
        for(const i of results) {

            logger.debug(`subscription.dao listSubscriptionsForEventMessage: i: ${JSON.stringify(i)}`);

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
                if (i['snsTopicArn']!==undefined) {
                    s.sns= {topicArn:i['snsTopicArn']};
                }

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
                const targetType = expandDelimitedAttribute(sk)[1];
                s.targets[targetType]= {};
                Object.keys(i)
                    .filter(k=> k!=='pk' && k!=='sk' && k!=='gsi2Key' && k!=='gsi2Sort')
                    .forEach(k=> s.targets[targetType][k]=i[k]);

            } else if (isPkType(sk,PkType.User)) {
                s.user = {
                    id: expandDelimitedAttribute(sk)[1]
                };

            } else if (sk==='alertStatus') {
                s.alerted = i['alerted'];
            }
            subscriptions[subscriptionId] = s;
        }

        logger.debug(`subscription.dao assemble: exit:${JSON.stringify(subscriptions)}`);
        return subscriptions;

    }
}
