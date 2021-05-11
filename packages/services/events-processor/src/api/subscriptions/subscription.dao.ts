/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger.util';
import { TYPES } from '../../di/types';
import DynamoDB, { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { SubscriptionItem } from './subscription.models';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute, isPkType, createDelimitedAttributePrefix } from '../../utils/pkUtils.util';
import { DynamoDbUtils } from '../../utils/dynamoDb.util';
import { TargetDao } from '../targets/target.dao';

type SubscriptionItemMap = {[subscriptionId:string] : SubscriptionItem};
export type PaginationKey = {[key:string]:string};

@injectable()
export class SubscriptionDao {

    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi2KeySk') private eventConfigGsi2KeyGsi2Sk:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi2KeyGsi2Sort') private eventConfigGsi2KeyGsi2Sort:string,
        @inject(TYPES.TargetDao) private targetDao:TargetDao,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.CachableDocumentClientFactory) cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._cachedDc = cachableDocumentClientFactory();
    }

    /**
     * Creates the Subscription DynamoDB items:
     *   Subscription:  pk='S-{subscriptionId}, sk='S-{subscriptionId}'
     *   Event:         pk='S-{subscriptionId}, sk='E-{eventId}'
     *   User:          pk='S-{subscriptionId}, sk='U-{userId}')
     *   Target(s):     pk='S-{subscriptionId}, sk='ST-{target}-{targetId}'
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
        const snsTopicArn = si?.sns?.topicArn;

        const subscriptionCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: subscriptionDbId,
                    gsi1Sort: createDelimitedAttribute(PkType.Event, si.event.id),
                    principalValue: si.principalValue,
                    ruleParameterValues: si.ruleParameterValues,
                    enabled: si.enabled,
                    snsTopicArn,
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
                    disableAlertThreshold: si.event.disableAlertThreshold ?? false,
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
                    name: si.event.name,
                    gsi1Sort: createDelimitedAttribute(PkType.Subscription, si.enabled, si.id),
                    gsi2Key,
                    gsi2Sort: createDelimitedAttribute(PkType.Subscription, si.id, PkType.User, si.user.id)
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[subscriptionCreate, eventCreate, userCreate];

        if (si.targets) {
            for (const targetType of Object.keys(si.targets)) {
                const targets =  si.targets[targetType];
                if (targets===undefined) {
                    continue;
                }
                for (const target of targets) {
                    const putItem = this.targetDao.buildPutItemAttributeMap(target, si.eventSource.id, si.eventSource.principal, si.principalValue);
                    params.RequestItems[this.eventConfigTable].push({
                        PutRequest: {
                            Item: putItem
                        }
                    });
                }
            }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('CREATE_SUBSCRIPTION_FAILED');
        }

        logger.debug(`subscriptions.dao create: exit:`);
    }

    public async update(si:SubscriptionItem): Promise<void> {
        logger.debug(`subscription.dao update: in: si:${JSON.stringify(si)}`);

        const params = {
            TableName: this.eventConfigTable,
            Key: {
                pk: createDelimitedAttribute(PkType.Subscription, si.id),
                sk: createDelimitedAttribute(PkType.Subscription, si.id)
            },
            UpdateExpression: 'set ruleParameterValues=:rp',
            ExpressionAttributeValues: {
                ':rp': si.ruleParameterValues
            }
        };

        await this._cachedDc.update(params).promise();

        logger.debug(`subscriptions.dao update: exit:`);
    }

    public async listSubscriptionsForEventMessage(eventSourceId:string, principal:string, principalValue:string): Promise<SubscriptionItem[]> {
        logger.debug(`subscription.dao listSubscriptionsForEventMessage: eventSourceId:${eventSourceId}, principal:${principal}, principalValue:${principalValue}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGsi2KeyGsi2Sort,
            KeyConditionExpression: `#key = :value`,
            ExpressionAttributeNames: {
                '#key': 'gsi2Key',
                '#name': 'name',
                '#token': 'token'
            },
            ExpressionAttributeValues: {
                ':value': createDelimitedAttribute(PkType.EventSource, eventSourceId, principal, principalValue )
            },
            Select: 'SPECIFIC_ATTRIBUTES',
            ProjectionExpression: 'address,attributeMapping,conditions,disableAlertThreshold,eventSourceId,#name,phoneNumber,pk,platformApplicationArn,platformEndpointArn,principal,principalValue,ruleParameterValues,sk,snsTopicArn,subscriptionArn,subscriptionId,tableName,targetType,#token,topic'
        };

        const items:DynamoDB.ItemList= [];
        let r = await this._cachedDc.query(params).promise();
        while(r.Items?.length>0) {
            items.push(...r.Items);
            if (r.LastEvaluatedKey===undefined) {
                break;
            }
            params.ExclusiveStartKey = r.LastEvaluatedKey;
            r = await this._cachedDc.query(params).promise();
        }
        if (items.length===0) {
            logger.debug('subscription.dao listSubscriptionsForEventMessage: exit: undefined');
            return undefined;
        }

        const subscriptions = this.assemble(items);
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
                '#range': 'gsi1Sort',
                '#pk': 'pk',
                '#sk': 'sk',
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Event, eventId ),
                ':range': createDelimitedAttributePrefix(PkType.Subscription)
            },
            Select: 'SPECIFIC_ATTRIBUTES',
            ProjectionExpression: '#pk,#sk,#name',
            ExclusiveStartKey: from
        };

        const results = await this._cachedDc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('subscription.dao listSubscriptionsForEvent: exit: undefined');
            return [undefined,undefined];
        }
        logger.debug(`subscription.dao listSubscriptionsForEvent: results: ${JSON.stringify(results)}`);

        const lastEvaluatedKey = results.LastEvaluatedKey;
        const subscriptions = this.assemble(results.Items);
        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForEvent: exit: response${JSON.stringify(response)}, lastEvaluatedKey:${JSON.stringify(lastEvaluatedKey)}`);
        return [response,lastEvaluatedKey];
    }

    public async listSubscriptionIdsForUserPrincipal(userId:string, principal:string, principalValue:string): Promise<string[]> {
        logger.debug(`subscription.dao listSubscriptionIdsForUser: userId:${userId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'sk',
                '#gsi2Key': 'gsi2Key',
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.User, userId),
                ':gsi2Key': principal.concat(':', principalValue)
            },
            // will return pk: S:{subscriptionId}
            FilterExpression: 'contains(#gsi2Key, :gsi2Key)',
            Select: 'SPECIFIC_ATTRIBUTES',
            ProjectionExpression: '#pk',
        };

        const subscriptionIds:string[]= [];

        let r = await this._cachedDc.query(params).promise();

        while(r.Items?.length>0) {
            subscriptionIds.push(...r.Items?.map(i=> (i['pk'] as string).split(':')[1]));
            if (r.LastEvaluatedKey===undefined) {
                break;
            }
            params.ExclusiveStartKey = r.LastEvaluatedKey;
            r = await this._cachedDc.query(params).promise();
        }

        logger.debug(`subscription.dao listSubscriptionsForUser: exit:${JSON.stringify(subscriptionIds)}`);
        return subscriptionIds;
    }
    
    public async listSubscriptionIdsForUser(userId:string): Promise<string[]> {
        logger.debug(`subscription.dao listSubscriptionIdsForUser: userId:${userId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'sk',
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                // will return pk: S:{subscriptionId}, sk: U:{userId}
                ':hash': createDelimitedAttribute(PkType.User, userId )
            },
            Select: 'SPECIFIC_ATTRIBUTES',
            ProjectionExpression: '#pk,#sk',
        };

        const subscriptionIds:string[]= [];
        let r = await this._cachedDc.query(params).promise();
        while(r.Items?.length>0) {
            subscriptionIds.push(...r.Items?.map(i=> (i['pk'] as string).split(':')[1]));
            if (r.LastEvaluatedKey===undefined) {
                break;
            }
            params.ExclusiveStartKey = r.LastEvaluatedKey;
            r = await this._cachedDc.query(params).promise();
        }

        logger.debug(`subscription.dao listSubscriptionsForUser: exit:${JSON.stringify(subscriptionIds)}`);
        return subscriptionIds;
    }

    public async listSubscriptionIdsForEventUserPrincipal(eventSourceId:string, eventId:string, principal:string, principalValue:string, userId:string): Promise<string[]> {
        logger.debug(`subscription.dao listSubscriptionsForEventUserPrincipal: eventSourceId:${eventSourceId}, eventId:${eventId}, principal:${principal}, principalValue:${principalValue}, userId:${userId}`);

        // first return all subscription ids for the event source / event / principal combination
        const paramsA:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGsi2KeyGsi2Sk,
            KeyConditionExpression: '#hash=:hash AND begins_with(#range, :range)',
            FilterExpression: '#gsi1Sort=:gsi1Sort',
            ExpressionAttributeNames: {
                '#hash': 'gsi2Key',
                '#range': 'sk',
                '#pk': 'pk',
                '#sk': 'sk',
                '#gsi1Sort': 'gsi1Sort'
            },
            ExpressionAttributeValues: {
                // this hash/range combo will return underlying pk/sk of S:{subscriptionId}/S:{subscriptionId}
                ':hash': createDelimitedAttribute(PkType.EventSource, eventSourceId, principal, principalValue ),
                ':range': createDelimitedAttributePrefix(PkType.Subscription),
                ':gsi1Sort': createDelimitedAttribute(PkType.Event, eventId )
            },
            Select: 'SPECIFIC_ATTRIBUTES',
            ProjectionExpression: '#pk,#sk',
        };

        const items:DynamoDB.ItemList= [];
        let rA = await this._cachedDc.query(paramsA).promise();
        while(rA.Items?.length>0) {
            items.push(...rA.Items);
            if (rA.LastEvaluatedKey===undefined) {
                break;
            }
            paramsA.ExclusiveStartKey = rA.LastEvaluatedKey;
            rA = await this._cachedDc.query(paramsA).promise();
        }
        if (items.length===0) {
            logger.debug('subscription.dao listSubscriptionsForEventUserPrincipal: exit: undefined');
            return undefined;
        }
        const subscriptionsA= this.assemble(items);

        // next we need to perform another query to filter those returned subscriptionIds by user
        // (due to backwards compatability, we have to use the existing indexes/data available to us)
        let found:SubscriptionItemMap;
        if (subscriptionsA!==undefined && Object.keys(subscriptionsA).length>0) {
            const paramsB:DocumentClient.BatchGetItemInput = {
                RequestItems: {}
            };
            paramsB.RequestItems[this.eventConfigTable]= {Keys: []};
            Object.keys(subscriptionsA).forEach(subId=> {
                paramsB.RequestItems[this.eventConfigTable].Keys.push({
                    pk: createDelimitedAttribute(PkType.Subscription, subId),
                    sk: createDelimitedAttribute(PkType.User, userId)
                });
            });
            const rB = await this.dynamoDbUtils.batchGetAll(paramsB);
            found = this.assemble(rB.Responses[this.eventConfigTable]);
        }

        // finally we return the subscription ids
        let response:string[];
        if (found) {
            response = Object.keys(found).map(k => found[k].id);
        }

        logger.debug(`subscription.dao listSubscriptionsForUserPrincipal: exit:${JSON.stringify(response)}`);
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

		const result = await this.dynamoDbUtils.batchWriteAll(deleteParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_SUBSCRIPTION_FAILED');
		}

        logger.debug(`subscription.dao delete: exit:`);
    }

    private assemble(items:AWS.DynamoDB.DocumentClient.ItemList) : SubscriptionItemMap {
        logger.debug(`subscription.dao assemble: in items: ${JSON.stringify(items)}`);

        const subscriptions:SubscriptionItemMap= {};
        for(const i of items) {

            logger.debug(`subscription.dao assemble: i: ${JSON.stringify(i)}`);

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
                    conditions: i['conditions'],
                    disableAlertThreshold: i['disableAlertThreshold']
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
                if (s.targets[targetType]===undefined) {
                    s.targets[targetType]= [];
                }
                const ti = this.targetDao.assemble({Item:i});
                s.targets[targetType].push(ti);

            } else if (isPkType(sk,PkType.User)) {
                s.user = {
                    id: expandDelimitedAttribute(sk)[1]
                };
                if (s.event===undefined) {
                    s.event = { name: i['name']};
                }

            } else if (sk==='alertStatus') {
                s.alerted = i['alerted'];
            }
            subscriptions[subscriptionId] = s;
        }

        logger.debug(`subscription.dao assemble: exit:${JSON.stringify(subscriptions)}`);
        return subscriptions;

    }
}
