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
import { logger } from '@awssolutions/simple-cdf-logger';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../../di/types';
import { DynamoDbUtils } from '../../utils/dynamoDb.util';
import {
    PkType,
    createDelimitedAttribute,
    createDelimitedAttributePrefix,
    expandDelimitedAttribute,
} from '../../utils/pkUtils.util';
import { MessageTemplates } from '../messages/messageTemplates.model';
import { PaginationKey } from '../subscriptions/subscription.dao';
import { EventItem } from './event.models';

type EventItemMap = { [subscriptionId: string]: EventItem };
@injectable()
export class EventDao {
    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable: string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1: string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.CachableDocumentClientFactory)
        cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._cachedDc = cachableDocumentClientFactory();
    }

    /**
     * Creates the Event DynamoDB items:
     *   pk='ES-$(eventSourceId}, sk='E-$(eventId}'
     *   pk='E-$(eventId}, sk='type').
     * @param event
     */
    public async save(item: EventItem): Promise<void> {
        logger.debug(`event.dao save: in: event:${JSON.stringify(item)}`);

        ow(item, ow.object.nonEmpty);
        ow(item.eventSourceId, ow.string.nonEmpty);
        ow(item.id, ow.string.nonEmpty);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };

        const eventSourceDbId = createDelimitedAttribute(PkType.EventSource, item.eventSourceId);
        const eventDbId = createDelimitedAttribute(PkType.Event, item.id);

        const eventDynamoDBItem = this.dynamoDbUtils.removeUndefinedParameter({
            pk: eventSourceDbId,
            sk: eventDbId,
            gsi1Sort: createDelimitedAttribute(
                PkType.Event,
                item.id,
                PkType.EventSource,
                item.eventSourceId
            ),
            name: item.name,
            principal: item.principal,
            conditions: item.conditions,
            ruleParameters: item.ruleParameters,
            enabled: item.enabled,
            templates: item.templates,
            supportedTargets: item.supportedTargets,
            templateProperties: item.templateProperties,
            disableAlertThreshold: item.disableAlertThreshold,
        });

        const eventCreate = {
            PutRequest: {
                Item: eventDynamoDBItem,
            },
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: eventDbId,
                    sk: createDelimitedAttribute(PkType.Type, PkType.Event),
                    name: item.name,
                    gsi1Sort: createDelimitedAttribute(PkType.Event, item.enabled, item.id),
                },
            },
        };

        params.RequestItems[this.eventConfigTable] = [eventCreate, typeCreate];

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('CREATE_EVENT_FAILED');
        }

        logger.debug(`event.dao save: exit:`);
    }

    public async get(eventId: string): Promise<EventItem> {
        logger.debug(`event.dao get: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        const params: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk = :sk AND begins_with( #gsi1Sort, :gsi1Sort )`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
                '#gsi1Sort': 'gsi1Sort',
            },
            ExpressionAttributeValues: {
                ':sk': createDelimitedAttribute(PkType.Event, eventId),
                ':gsi1Sort': createDelimitedAttributePrefix(PkType.Event, eventId),
            },
        };

        const results = await this._cachedDc.query(params).promise();
        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('event.dao get: exit: undefined');
            return undefined;
        }

        const events = this.assemble(results.Items);

        logger.debug(`event.dao get: exit: response:${JSON.stringify(events[eventId])}`);
        return events[eventId];
    }

    private assemble(results: AWS.DynamoDB.DocumentClient.ItemList): EventItemMap {
        logger.debug(`event.dao assemble: items: ${JSON.stringify(results)}`);

        const events: EventItemMap = {};
        for (const i of results) {
            const eventId = expandDelimitedAttribute(i.sk)[1];

            const event: EventItem = {
                id: eventId,
                eventSourceId: expandDelimitedAttribute(i.pk)[1],
                name: i.name,
                principal: i.principal,
                conditions: i.conditions,
                ruleParameters: i.ruleParameters,
                enabled: i.enabled,
                templates: i.templates,
                supportedTargets: i.supportedTargets,
                templateProperties: i.templateProperties,
                disableAlertThreshold: i.disableAlertThreshold,
            };

            events[eventId] = event;
        }

        logger.debug(`event.dao assemble: exit: ${JSON.stringify(events)}`);
        return events;
    }

    public async delete(eventId: string): Promise<void> {
        logger.debug(`event.dao delete: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        // start to build up delete requests
        const deleteParams: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        deleteParams.RequestItems[this.eventConfigTable] = [];

        // find the event source record to be deleted
        const findByGSIParams: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk=:sk`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
            },
            ExpressionAttributeValues: {
                ':sk': createDelimitedAttribute(PkType.Event, eventId),
            },
        };

        const results = await this._cachedDc.query(findByGSIParams).promise();

        // if found, add to the list to be deleted
        if (results.Items !== undefined && results.Items.length > 0) {
            for (const item of results.Items) {
                deleteParams.RequestItems[this.eventConfigTable].push({
                    DeleteRequest: {
                        Key: {
                            pk: item.pk,
                            sk: item.sk,
                        },
                    },
                });
            }
        }

        // add the remaining event items to be deleted
        deleteParams.RequestItems[this.eventConfigTable].push({
            DeleteRequest: {
                Key: {
                    pk: createDelimitedAttribute(PkType.Event, eventId),
                    sk: createDelimitedAttribute(PkType.Type, PkType.Event),
                },
            },
        });

        // delete them
        const result = await this.dynamoDbUtils.batchWriteAll(deleteParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_EVENT_FAILED');
        }

        logger.debug(`event.dao delete: exit:`);
    }

    public async listEventsForEventSource(
        eventSourceId: string,
        count?: number,
        from?: PaginationKey
    ): Promise<[EventItem[], PaginationKey]> {
        logger.debug(
            `event.dao listEventsForEventSource: in: eventSourceId:${eventSourceId}, count:${count}, from:${JSON.stringify(
                from
            )}`
        );

        const params: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#hash=:hash AND begins_with(#range, :range)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.EventSource, eventSourceId),
                ':range': createDelimitedAttributePrefix(PkType.Event),
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: from,
            Limit: count,
        };

        logger.debug(`event.dao listEventsForEventSource: params:${JSON.stringify(params)}`);
        const results = await this._cachedDc.query(params).promise();
        if (results.Items === undefined) {
            logger.debug('event.dao listEventsForEventSource: exit: undefined');
            return undefined;
        }

        const lastEvaluatedKey = results.LastEvaluatedKey;
        const events = this.assemble(results.Items);
        const response: EventItem[] = Object.keys(events).map((k) => events[k]);

        logger.debug(
            `event.dao listEventsForEventSource: exit: response${JSON.stringify(
                response
            )}, lastEvaluatedKey:${JSON.stringify(lastEvaluatedKey)}`
        );
        return [response, lastEvaluatedKey];
    }

    public async getEventConfig(eventId: string): Promise<MessageTemplates> {
        logger.debug(`event.dao getEventConfig: in: eventId:${eventId}`);
        const templates = new MessageTemplates();
        const event: EventItem = await this.get(eventId);

        if (event === undefined) {
            return templates;
        }

        const i = event;
        templates.supportedTargets = i.supportedTargets;
        templates.templates = i.templates;
        templates.templateProperties = i.templateProperties;

        logger.debug(`event.dao getEventConfig: exit: templates${JSON.stringify(templates)}`);

        return templates;
    }
}
