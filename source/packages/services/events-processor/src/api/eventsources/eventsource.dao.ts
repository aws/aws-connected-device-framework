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
import { TYPES } from '../../di/types';
import { DynamoDbUtils } from '../../utils/dynamoDb.util';
import {
    PkType,
    createDelimitedAttribute,
    expandDelimitedAttribute,
} from '../../utils/pkUtils.util';
import { EventSourceItem } from './eventsource.models';

@injectable()
export class EventSourceDao {
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
     * Creates the EventSource DynamoDB items (pk='ES-$(eventSourceId}, sk='ES-$(eventSourceId}' and sk='type').
     * @param es
     */
    public async create(es: EventSourceItem): Promise<void> {
        logger.debug(`eventsource.dao create: in: es:${JSON.stringify(es)}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };

        const eventSourceDynamoDBItem = this.dynamoDbUtils.removeUndefinedParameter({
            pk: createDelimitedAttribute(PkType.EventSource, es.id),
            sk: createDelimitedAttribute(PkType.Type, PkType.EventSource),
            gsi1Sort: createDelimitedAttribute(PkType.EventSource, es.enabled, es.id),
            name: es.name,
            sourceType: es.sourceType,
            principal: es.principal,
            enabled: es.enabled,
            dynamoDb: es.dynamoDb,
            iotCore: es.iotCore,
        });

        const eventSourceCreate = {
            PutRequest: {
                Item: eventSourceDynamoDBItem,
            },
        };

        params.RequestItems[this.eventConfigTable] = [eventSourceCreate];

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('CREATE_EVENT_SOURCE_FAILED');
        }

        logger.debug(`events.dao create: exit:`);
    }

    public async list(): Promise<EventSourceItem[]> {
        logger.debug('eventsource.dao get: list:');

        const params: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk = :sk`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
            },
            ExpressionAttributeValues: {
                ':sk': createDelimitedAttribute(PkType.Type, PkType.EventSource),
            },
        };

        logger.debug(`eventsource.dao list: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._cachedDc.query(params).promise();
        if (results.Items === undefined) {
            logger.debug('eventsource.dao list: exit: undefined');
            return [];
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const response: EventSourceItem[] = [];
        for (const i of results.Items) {
            response.push(this.assembleItem(i));
        }

        logger.debug(`eventsource.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    private assembleItem(attrs: DocumentClient.AttributeMap) {
        const r: EventSourceItem = {
            id: expandDelimitedAttribute(attrs.pk)[1],
            name: attrs.name,
            sourceType: attrs.sourceType,
            principal: attrs.principal,
            enabled: attrs.enabled,
            dynamoDb: attrs.dynamoDb,
            iotCore: attrs.iotCore,
        };
        return r;
    }

    public async get(eventSourceId: string): Promise<EventSourceItem> {
        logger.debug(`eventsource.dao get: in: eventSourceId:${eventSourceId}`);

        const params: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#hash=:hash AND #range=:range`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.EventSource, eventSourceId),
                ':range': createDelimitedAttribute(PkType.Type, PkType.EventSource),
            },
        };

        logger.debug(`eventsource.dao get: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._cachedDc.query(params).promise();
        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('eventsource.dao get: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const response: EventSourceItem = this.assembleItem(results.Items[0]);

        logger.debug(`eventsource.dao get: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async delete(eventSourceId: string): Promise<void> {
        logger.debug(`eventsource.dao delete: in: eventSourceId:${eventSourceId}`);

        // start to build up delete requests
        const deleteParams: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        deleteParams.RequestItems[this.eventConfigTable] = [];

        // find the event source record to be deleted
        const queryParams: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.EventSource, eventSourceId),
            },
        };

        const results = await this._cachedDc.query(queryParams).promise();

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

        const result = await this.dynamoDbUtils.batchWriteAll(deleteParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_EVENT_SOURCE_FAILED');
        }

        logger.debug(`eventsource.dao delete: exit:`);
    }
}
