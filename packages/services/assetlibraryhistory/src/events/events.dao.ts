
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { StateHistoryModel, StateHistoryListModel } from './events.models';
import AWS = require('aws-sdk');
import { DocumentClient, AttributeValue } from 'aws-sdk/clients/dynamodb';
import btoa from 'btoa';
import atob from 'atob';

@injectable()
export class EventsDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.events') private eventsTable:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async getLatest(objectId:string): Promise<StateHistoryModel> {
        logger.debug(`events.dao getLatest: in: objectId:${JSON.stringify(objectId)}`);

        const params = {
            TableName : this.eventsTable,
            Key: {
                objectId,
                time: 'latest'
            }
        };

        const r =  await this._dc.get(params).promise();

        if (r.Item===undefined) {
            logger.debug('events.dao getLatest: exit: undefined');
            return undefined;
        }

        const i = r.Item;
        const event = {
            objectId: i['objectId'],
            type: i['type'],
            time: i['time'],
            event: i['event'],
            user: i['user'],
            state: i['state']
        };

        logger.debug(`events.dao getLatest: exit: event:${JSON.stringify(event)}`);
        return event;

    }

    public async create(model:StateHistoryModel): Promise<void> {
        logger.debug(`events.dao create: in: model:${JSON.stringify(model)}`);

        const params:DocumentClient.PutItemInput = {
            TableName: this.eventsTable,
            Item: {
                objectId: model.objectId,
                type:model.type,
                time:model.time,
                event:model.event,
                user:model.user,
                state:model.state
            }
        };

        logger.debug(`events.dao create: params:${JSON.stringify(params)}`);
        await this._dc.put(params).promise();

        logger.debug(`events.dao create: exit:`);

    }

    public async update(model:StateHistoryModel): Promise<void> {
        logger.debug(`events.dao update: in: model:${JSON.stringify(model)}`);

        const params:DocumentClient.UpdateItemInput = {
            TableName: this.eventsTable,
            Key: { objectId:model.objectId, time:model.time},
            UpdateExpression: '',
            ExpressionAttributeNames: {},
            ExpressionAttributeValues: {}
        };

        Object.keys(model).forEach(k=> {
            if (model.hasOwnProperty(k) && k !== 'objectId' && k !== 'time' && model[k] !== undefined ) {
                if (params.UpdateExpression==='') {
                    params.UpdateExpression+='set ';
                } else {
                    params.UpdateExpression+=', ';
                }
                params.UpdateExpression += `#${k} = :${k}`;
                params.ExpressionAttributeNames[`#${k}`] = k;
                params.ExpressionAttributeValues[`:${k}`] = model[k];
            }
        });

        // TODO add optimistic locking

        logger.debug(`events.dao update: params:${JSON.stringify(params)}`);
        await this._dc.update(params).promise();

        logger.debug(`events.dao update: exit:`);

    }

    public async listCategoryEvents(args: ListCategoryEventsArgs): Promise<StateHistoryListModel> {
        logger.debug(`events.dao listCategoryEvents: args:${JSON.stringify(args)}`);

        // initialize the key
        let keyConditionExpression = '#type = :type';
        const expressionAttributeNames:DocumentClient.ExpressionAttributeNameMap = {'#type': 'type'};
        const expressionAttributeValues:DocumentClient.ExpressionAttributeValueMap = {':type': args.category};

        // apply the filters
        keyConditionExpression = this.applyTimeRangeFilter(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, args.timeFrom, args.timeTo);
        let filterExpression:string;
        filterExpression= this.applyUserFilter(filterExpression, expressionAttributeNames, expressionAttributeValues, args.user);
        filterExpression= this.applyEventFilter(filterExpression, expressionAttributeNames, expressionAttributeValues, args.event);

        // apply pagination if provided
        let exclusiveStartKey:{[key: string]: AttributeValue};
        if (args.token) {
            const lastEvaluated:string[] = atob(args.token).split(':::');
            exclusiveStartKey= {};
            exclusiveStartKey['objectId'] = lastEvaluated[0] as AttributeValue;
            exclusiveStartKey['time'] = lastEvaluated[1] as AttributeValue;
        }

        // the params for the dynamodb call
        const scanIndexForward = (args.sort===SortDirection.asc);
        const params:DocumentClient.QueryInput = {
            TableName: this.eventsTable,
            IndexName: 'type-time-index',
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            FilterExpression: filterExpression,
            Limit: args.limit,
            ScanIndexForward: scanIndexForward,
            ExclusiveStartKey: exclusiveStartKey
        };

        logger.debug(`events.dao listCategoryEvents: params: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();

        const response = this.assembleEventList(results);

        logger.debug(`events.dao listCategoryEvents: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async listObjectEvents(args: ListObjectEventsArgs): Promise<StateHistoryListModel> {
        logger.debug(`events.dao listObjectEvents: args:${JSON.stringify(args)}`);

        // initialize the key
        let keyConditionExpression = '#objectId = :objectId';
        const expressionAttributeNames:DocumentClient.ExpressionAttributeNameMap = {'#objectId': 'objectId'};
        const expressionAttributeValues:DocumentClient.ExpressionAttributeValueMap = {':objectId': args.objectId};

        // apply the time filter which may be for a specific time, or for a time range
        let scanIndexForward = (args.sort===SortDirection.asc);
        if (args.timeAt) {
            keyConditionExpression+=' and #time between :timeFrom and :timeTo';
            expressionAttributeNames['#time'] = 'time';
            expressionAttributeValues[':timeFrom'] = args.timeAt;
            expressionAttributeValues[':timeTo'] = '9999';
            args.limit=1;
            scanIndexForward=true;
        } else {
            keyConditionExpression = this.applyTimeRangeFilter(keyConditionExpression, expressionAttributeNames, expressionAttributeValues, args.timeFrom, args.timeTo);
        }

        // apply any other filtering
        let filterExpression:string;
        filterExpression= this.applyUserFilter(filterExpression, expressionAttributeNames, expressionAttributeValues, args.user);
        filterExpression= this.applyEventFilter(filterExpression, expressionAttributeNames, expressionAttributeValues, args.event);

        // apply pagination if provided
        let exclusiveStartKey:{[key: string]: AttributeValue};
        if (args.token) {
            const lastEvaluated:string[] = atob(args.token).split(':::');
            exclusiveStartKey= {};
            exclusiveStartKey['objectId'] = lastEvaluated[0] as AttributeValue;
            exclusiveStartKey['time'] = lastEvaluated[1] as AttributeValue;
        }

        // the params for the dynamodb call
        const params:DocumentClient.QueryInput = {
            TableName: this.eventsTable,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            FilterExpression: filterExpression,
            Limit: args.limit,
            ScanIndexForward: scanIndexForward,
            ExclusiveStartKey: exclusiveStartKey
        };

        logger.debug(`events.dao listObjectEvents: params: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();

        const response = this.assembleEventList(results);

        logger.debug(`events.dao listObjectEvents: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    private applyTimeRangeFilter(keyConditionExpression:string, expressionAttributeNames:DocumentClient.ExpressionAttributeNameMap,
        expressionAttributeValues:DocumentClient.ExpressionAttributeValueMap, timeFrom:string, timeTo:string):string {
        if (!timeFrom && !timeTo) {
            return keyConditionExpression;
        }
        keyConditionExpression+=' and #time between :timeFrom and :timeTo';
        expressionAttributeNames['#time'] = 'time';
        expressionAttributeValues[':timeFrom'] = timeFrom;
        expressionAttributeValues[':timeTo'] = timeTo;
        return keyConditionExpression;
    }

    private applyUserFilter(filterExpression:string, expressionAttributeNames:DocumentClient.ExpressionAttributeNameMap,
        expressionAttributeValues:DocumentClient.ExpressionAttributeValueMap, user:string):string {
        if (user) {
            filterExpression = this.appendFilterExpression(filterExpression, '#user = :user');
            expressionAttributeNames['#user'] = 'user';
            expressionAttributeValues[':user'] = user;
        }
        return filterExpression;
    }

    private applyEventFilter(filterExpression:string, expressionAttributeNames:DocumentClient.ExpressionAttributeNameMap,
        expressionAttributeValues:DocumentClient.ExpressionAttributeValueMap, event:string):string {
        if (event) {
            filterExpression = this.appendFilterExpression(filterExpression, '#event = :event');
            expressionAttributeNames['#event'] = 'event';
            expressionAttributeValues[':event'] = event;
        }
        return filterExpression;
    }

    private assembleEventList(results:DocumentClient.QueryOutput): StateHistoryListModel {
        logger.debug(`events.dao assembleEventList: in: results:${JSON.stringify(results)}`);

        const events:StateHistoryModel[]=[];
        const response:StateHistoryListModel = {
            events
        };

        if (results.Items===undefined) {
            logger.debug('events.dao assembleEventList: exit: events:undefined');
            return undefined;
        }

        for(const item of results.Items) {
            const event = {
                objectId: item['objectId'],
                type: item['type'],
                time: item['time'],
                event: item['event'],
                user: item['user'],
                state: '{}'
            };
            if (item['state']!==undefined) {
                event['state'] = JSON.parse(item['state']);
            }
            response.events.push(event);
        }

        if (results.LastEvaluatedKey) {
            response.pagination = {
                token: btoa(`${results.LastEvaluatedKey['objectId']}:::${results.LastEvaluatedKey['time']}`),
                limit:1
            };
        }

        logger.debug(`events.dao assembleEventList: exit: events:${JSON.stringify(response)}`);
        return response;
    }

    private appendFilterExpression(existing:string, toAppend:string):string {
        if (existing===undefined) {
            return toAppend;
        } else {
            return `${existing} and ${toAppend}`;
        }
    }

}

export interface ListCategoryEventsArgs {
    category:string;

    timeFrom?:string;
    timeTo?:string;
    user?:string;
    event?:string;

    sort?:SortDirection;
    token?:string;
    limit?:number;
}

export interface ListObjectEventsArgs {
    category:string;
    objectId:string;

    timeAt?:string;
    timeFrom?:string;
    timeTo?:string;
    user?:string;
    event?:string;

    sort?:SortDirection;
    token?:string;
    limit?:number;
}

export enum SortDirection {
    asc = 'asc',
    desc = 'desc'
}
