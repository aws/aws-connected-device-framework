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
import { createDelimitedAttribute, PkType } from '../../utils/pkUtils';

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
    public async create(event:EventItem, typeGsiSort:string): Promise<void> {
        logger.debug(`event.dao create: in: event:${JSON.stringify(event)}, typeGsiSort:${typeGsiSort}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const eventCreate = {
            PutRequest: {
                Item: {
                    pk: event.pk,
                    sk: event.sk,
                    gsi1Sort: event.gsi1Sort,
                    name: event.name,
                    principal: event.principal,
                    ruleDefinition: event.ruleDefinition,
                    ruleParameters: event.ruleParameters,
                    enabled: event.enabled
                }
            }
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: event.sk,
                    sk: 'type',
                    gsi1Sort: typeGsiSort,
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
                ':gsi1Sort': createDelimitedAttribute(PkType.Event, eventId)
            }
        };

        logger.debug(`event.dao get: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('event.dao get: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const response:EventItem = {
            pk:undefined,
            sk:undefined
        } ;
        Object.keys(results.Items[0]).forEach( key => {
            response[key] = results.Items[0][key];
        });

        logger.debug(`event.dao get: exit: response:${JSON.stringify(response)}`);
        return response;
    }

}
