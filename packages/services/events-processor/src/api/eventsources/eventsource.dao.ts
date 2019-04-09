/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger';
import { TYPES } from '../../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { EventSourceItem } from './eventsource.models';
import { delimitedAttributePrefix, PkType, createDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class EventSourceDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    /**
     * Creates the EventSource DynamoDB items (pk='ES-$(eventSourceId}, sk='ES-$(eventSourceId}' and sk='type').
     * @param es
     */
    public async create(es:EventSourceItem, typeGsiSk:string): Promise<void> {
        logger.debug(`eventsource.dao create: in: es:${JSON.stringify(es)}, typeGsiSk:${typeGsiSk}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };

        const eventSourceCreate = {
            PutRequest: {
                Item: {
                    pk: es.pk,
                    sk: es.sk,
                    sourceType: es.sourceType,
                    principal: es.principal,
                    enabled: es.enabled,
                    tableName: es.tableName
                }
            }
        };

        const typeCreate = {
            PutRequest: {
                Item: {
                    pk: es.pk,
                    sk: 'type',
                    gsi1Sort: typeGsiSk,
                }
            }
        };

        params.RequestItems[this.eventConfigTable]=[eventSourceCreate, typeCreate];

        logger.debug(`eventsource.dao create: params:${JSON.stringify(params)}`);
        await this._dc.batchWrite(params).promise();

        logger.debug(`events.dao create: exit:`);
    }

    public async list(): Promise<EventSourceItem[]> {
        logger.debug('eventsource.dao get: list:');

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk = :sk AND begins_with( #gsi1Sort, :gsi1Sort )`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
                '#gsi1Sort': 'gsi1Sort'
            },
            ExpressionAttributeValues: {
                ':sk': 'type',
                ':gsi1Sort': delimitedAttributePrefix(PkType.EventSource)
            }

        };

        logger.debug(`eventsource.dao list: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined) {
            logger.debug('eventsource.dao list: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const response:EventSourceItem[]=[];
        for(const i of results.Items) {
            const r:EventSourceItem = {
                pk:undefined,
                sk:undefined
            } ;
            Object.keys(i).forEach( key => {
                r[key] = i[key];
            });

            response.push(r);
        }

        logger.debug(`eventsource.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async get(eventSourceId:string): Promise<EventSourceItem> {
        logger.debug(`eventsource.dao get: in: eventSourceId:${eventSourceId}`);

        const params:DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            KeyConditionExpression: `#pk = :id AND #sk = :id`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':id': createDelimitedAttribute(PkType.EventSource, eventSourceId)
            }

        };

        logger.debug(`eventsource.dao get: QueryInput: ${JSON.stringify(params)}`);

        const results = await this._dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('eventsource.dao get: exit: undefined');
            return undefined;
        }

        logger.debug(`query result: ${JSON.stringify(results)}`);

        const response:EventSourceItem = {
            pk:undefined,
            sk:undefined
        } ;
        Object.keys(results.Items[0]).forEach( key => {
            response[key] = results.Items[0][key];
        });

        logger.debug(`eventsource.dao get: exit: response:${JSON.stringify(response)}`);
        return response;
    }
}
