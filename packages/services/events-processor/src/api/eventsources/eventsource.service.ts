/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This eventSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger';
import ow from 'ow';
import { EventSourceType, EventSourceResourceList, EventSourceDetailResource, EventSourceSummaryResource } from './eventSource.models';
import { EventSourceDao } from './eventsource.dao';
import { EventSourceAssembler } from './eventsource.assembler';

@injectable()
export class EventSourceService  {

    private ddb: AWS.DynamoDB;
    private lambda: AWS.Lambda;

    constructor(
        @inject('aws.lambda.dynamoDbStream.name') private dynamoDbStreamEntryLambda:string,
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao,
        @inject(TYPES.EventSourceAssembler) private eventSourceAssembler: EventSourceAssembler,
	    @inject(TYPES.DynamoDBFactory) dynamoDBFactory: () => AWS.DynamoDB,
        @inject(TYPES.LambdaFactory) lambdaFactory: () => AWS.Lambda) {
            this.ddb = dynamoDBFactory();
            this.lambda = lambdaFactory();
        }

    public async create(resource:EventSourceDetailResource) : Promise<void> {
        logger.debug(`eventSource.service create: in: model:${JSON.stringify(resource)}`);

        // TODO: validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.sourceType, ow.string.nonEmpty);
        ow(resource.principal, ow.string.nonEmpty);

        // enable by default
        if (resource.enabled===undefined) {
            resource.enabled = true;
        }

        switch (resource.sourceType) {
            case EventSourceType.DynamoDBStream:
                ow( resource.tableName, ow.string.nonEmpty);
                await this.createDDBStreamEventSource(resource);
                break;
            default:
                throw new Error('NOT_IMPLEMENTED');
        }

        const item = this.eventSourceAssembler.toItem(resource);
        await this.eventSourceDao.create(item);

        logger.debug(`eventSource.service create: exit:`);
    }

    public async delete(resource:EventSourceDetailResource):Promise<void> {
        logger.debug(`eventSource.service delete: in: model:${JSON.stringify(resource)}`);

        // TODO: validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.eventSourceId, ow.string.nonEmpty);

        // TODO: find and delete all affected events

        // TODO: delete the event source data

        const item = this.eventSourceAssembler.toItem(resource);
        await this.eventSourceDao.delete(item);

        logger.debug(`eventSource.service delete: exit:`);
    }

    private async createDDBStreamEventSource(model:EventSourceDetailResource) : Promise<void> {
        logger.debug(`eventSource.service createDDBStreamEventSource: in: model:${JSON.stringify(model)}`);

        // check to see if stream already exists on table
        let tableInfo: AWS.DynamoDB.Types.DescribeTableOutput;
        try  {
            tableInfo = await this.ddb.describeTable({TableName:model.tableName}).promise();
            logger.debug(`describeTable result: ${JSON.stringify(tableInfo)}`);
        } catch (err) {
            logger.error(`describeTable err:${JSON.stringify(err)}`);
            throw new Error(`INVALID_TABLE: Table ${model.tableName} not found.`);
        }

        // if streams are not enabled, configure it
        if (tableInfo.Table.StreamSpecification === undefined || tableInfo.Table.StreamSpecification.StreamEnabled===false) {
            logger.debug(`Stream not enabled for table ${model.tableName}, therefore enabling`);
            const updateParams: AWS.DynamoDB.UpdateTableInput = {
                TableName: model.tableName,
                StreamSpecification: {
                    StreamEnabled: true,
                    StreamViewType: 'NEW_IMAGE'
                }
            };
            await this.ddb.updateTable(updateParams).promise();
            tableInfo = await this.ddb.describeTable({TableName:model.tableName}).promise();
        }

        // wire up the event source mapping
        const listParams:AWS.Lambda.Types.ListEventSourceMappingsRequest = {
            EventSourceArn: tableInfo.Table.LatestStreamArn,
            FunctionName: this.dynamoDbStreamEntryLambda
        };
        const eventSources = await this.lambda.listEventSourceMappings(listParams).promise();
        if (eventSources.EventSourceMappings.length===0) {
            const createParams:AWS.Lambda.Types.CreateEventSourceMappingRequest = {
                EventSourceArn: tableInfo.Table.LatestStreamArn,
                FunctionName: this.dynamoDbStreamEntryLambda,
                Enabled: true,
                StartingPosition: 'LATEST'
            };
            await this.lambda.createEventSourceMapping(createParams).promise();
        }

    }

    public async list(): Promise<EventSourceResourceList> {
        logger.debug(`eventSource.service list: in:`);

        const items = await this.eventSourceDao.list();
        // const model = this.eventSourceAssembler.toModelList(nodes);

        // TODO: refactor into assembler
        const r:EventSourceResourceList = {
            results:[]
        };
        items.forEach(i=> {
            const resource:EventSourceSummaryResource = {
                eventSourceId: i.id
            };
            r.results.push(resource);
        });

        logger.debug(`eventSource.service list: exit:${JSON.stringify(r)}`);
        return r;
    }

    public async get(eventSourceId:string): Promise<EventSourceDetailResource> {
        logger.debug(`eventSource.service get: in: eventSourceId:${eventSourceId}`);

        ow(eventSourceId, ow.string.nonEmpty);

        const result  = await this.eventSourceDao.get(eventSourceId);
        logger.debug(`eventSource.service get: eventSource:${JSON.stringify(result)}`);

        let model:EventSourceDetailResource;
        if (result!==undefined ) {
            model = this.eventSourceAssembler.toResource(result);
        }

        logger.debug(`eventSource.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

}
