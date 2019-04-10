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
import { createDelimitedAttribute, PkType, createDelimitedAttributePrefix, expandDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class SubscriptionDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi3') private eventConfigGSI3:string,
        @inject('aws.dynamoDb.tables.eventConfig.partitions') private eventConfigPartitions:number,
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
    public async create(si:SubscriptionItem): Promise<void> {
        logger.debug(`subscription.dao create: in: si:${JSON.stringify(si)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const subscriptionDbId = createDelimitedAttribute(PkType.Subscription, si.id);
        const gsiBucket = `${Math.floor(Math.random() * this.eventConfigPartitions)}`;

        const subscriptionCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: subscriptionDbId,
                    ruleParameterValues: si.ruleParameterValues,
                    enabled: si.enabled,
                    alerted: si.alerted,
                    gsiBucket,
                    gsi2Sort: createDelimitedAttribute(PkType.Event, si.enabled, si.id),
                    gsi3Sort: createDelimitedAttribute(PkType.EventSource, si.eventSource.id, si.eventSource.principal, si.id)
                }
            }
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: 'type',
                    gsi1Sort: createDelimitedAttribute(PkType.Subscription, si.enabled, si.id),
                }
            }
        };

        const eventCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: createDelimitedAttribute(PkType.Event, si.event.id),
                    ruleDefinition: si.event.ruleDefinition,
                    principal: si.eventSource.principal,
                    eventSourceId: si.eventSource.id,
                    gsiBucket,
                    gsi3Sort: createDelimitedAttribute(PkType.EventSource, si.eventSource.principal, si.id, si.event.id)
                }
            }
        };

        const userCreate = {
            PutRequest: {
                Item: {
                    pk: subscriptionDbId,
                    sk: createDelimitedAttribute(PkType.User, si.user.id),
                    gsi1Sort: createDelimitedAttribute(PkType.Subscription, si.enabled, si.id),
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[subscriptionCreate, typeCreate, eventCreate, userCreate];

        logger.debug(`subscription.dao create: params:${JSON.stringify(params)}`);
        await this._dc.batchWrite(params).promise();

        logger.debug(`subscriptions.dao create: exit:`);
    }

    public async listSubscriptionsForEventSource(eventSourceId:string, principal:string): Promise<SubscriptionItem[]> {
        logger.debug(`subscription.dao listSubscriptionsForEventSource: eventSourceId:${eventSourceId},principal:${principal}`);

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

        logger.debug(`subscription.dao listSubscriptionsForEventSource: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('subscription.dao listSubscriptionsForEventSource: exit: undefined');
            return undefined;
        }

        logger.debug(`subscription.dao listSubscriptionsForEventSource: query result: ${JSON.stringify(results)}`);

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
            if (sk.startsWith(createDelimitedAttributePrefix(PkType.Subscription))) {
                s.ruleParameterValues = i['ruleParameterValues'];
                s.enabled = i['enabled'];
                s.alerted = i['alerted'];
            } else if (sk.startsWith(createDelimitedAttributePrefix(PkType.Event))) {
                s.event = {
                    id: expandDelimitedAttribute(i['sk'])[1],
                    ruleDefinition: i['ruleDefinition']
                };
                s.eventSource = {
                    id: i['eventSourceId'],
                    principal: i['principal']
                };
            } else if (sk.startsWith(createDelimitedAttributePrefix(PkType.User))) {
                s.user = {
                    id: expandDelimitedAttribute(i['sk'])[1]
                };
            }
            subscriptions[subscriptionId] = s;
        }

        const response:SubscriptionItem[] = Object.keys(subscriptions).map(k => subscriptions[k]);

        logger.debug(`subscription.dao listSubscriptionsForEventSource: exit: subscriptions:${JSON.stringify(response)}`);
        return response;
    }

}
