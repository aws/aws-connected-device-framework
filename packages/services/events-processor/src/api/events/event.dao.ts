/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger';
import { TYPES } from '../../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { EventItem } from './event.models';
import { createDelimitedAttribute, PkType, createDelimitedAttributePrefix, expandDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class EventDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    /**
     * Creates the Event DynamoDB items:
     *   pk='ES-$(eventSourceId}, sk='E-$(eventId}'
     *   pk='E-$(eventId}, sk='type').
     * @param event
     */
    public async create(item:EventItem): Promise<void> {
        logger.debug(`event.dao create: in: event:${JSON.stringify(event)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const eventSourceDbId = createDelimitedAttribute(PkType.EventSource, item.eventSourceId);
        const eventDbId = createDelimitedAttribute(PkType.Event, item.id);

        const eventCreate = {
            PutRequest: {
                Item: {
                    pk: eventSourceDbId,
                    sk: eventDbId,
                    gsi1Sort: createDelimitedAttribute(PkType.Event, item.id, PkType.EventSource, item.eventSourceId),
                    name: item.name,
                    principal: item.principal,
                    ruleDefinition: item.ruleDefinition,
                    ruleParameters: item.ruleParameters,
                    enabled: item.enabled
                }
            }
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: eventDbId,
                    sk: 'type',
                    gsi1Sort: createDelimitedAttribute(PkType.Event, item.enabled, item.id),
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[eventCreate, typeCreate];

        logger.debug(`event.dao create: params:${JSON.stringify(params)}`);
        await this._dc.batchWrite(params).promise();

        logger.debug(`event.dao create: exit:`);
    }

    public async get(eventId:string): Promise<EventItem> {
        logger.debug(`event.dao get: in: eventId:${eventId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk = :sk AND begins_with( #gsi1Sort, :gsi1Sort )`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
                '#gsi1Sort': 'gsi1Sort'
            },
            ExpressionAttributeValues: {
                ':sk': createDelimitedAttribute(PkType.Event, eventId),
                ':gsi1Sort': createDelimitedAttributePrefix(PkType.Event, eventId)
            }
        };

        logger.debug(`event.dao get: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('event.dao get: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const i = results.Items[0];
        const response:EventItem = {
            id: expandDelimitedAttribute(i['sk'])[1],
            eventSourceId: expandDelimitedAttribute(i['pk'])[1],
            name: i['name'],
            principal: i['principal'],
            ruleDefinition: i['ruleDefinition'],
            ruleParameters: i['ruleParameters'],
            enabled: i['enabled']
        } ;

        logger.debug(`event.dao get: exit: response:${JSON.stringify(response)}`);
        return response;
    }

}
