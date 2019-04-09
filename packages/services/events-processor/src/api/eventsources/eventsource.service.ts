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
import { expandDelimitedAttribute } from '../../utils/pkUtils';
import { EventSourceAssembler } from './eventsource.assembler';

@injectable()
export class EventSourceService  {

    private ddb: AWS.DynamoDB;

    constructor(
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao,
        @inject(TYPES.EventSourceAssembler) private eventSourceAssembler: EventSourceAssembler,
	    @inject(TYPES.DynamoDBFactory) dynamoDBFactory: () => AWS.DynamoDB) {
            this.ddb = dynamoDBFactory();
        }

    public async create(resource:EventSourceDetailResource) : Promise<void> {
        logger.debug(`eventSource.full.service create: in: model:${JSON.stringify(resource)}`);

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

        const [item, typeGsiSort] = this.eventSourceAssembler.toItem(resource);
        await this.eventSourceDao.create(item, typeGsiSort);

        logger.debug(`eventSource.full.service create: exit:`);
    }

    private async createDDBStreamEventSource(model:EventSourceDetailResource) : Promise<void> {
        logger.debug(`eventSource.full.service createDDBStreamEventSource: in: model:${JSON.stringify(model)}`);

        // check to see if stream already exists on table
        let r: AWS.DynamoDB.Types.DescribeTableOutput;
        try  {
            r = await this.ddb.describeTable({TableName:model.tableName}).promise();
            logger.debug(`describeTable result: ${JSON.stringify(r)}`);
        } catch (err) {
            throw new Error(`INVALID_TABLE: Table ${model.tableName} not found.`);
        }

        // if streams are not enabled, configure it
        if (r.Table.StreamSpecification === undefined || r.Table.StreamSpecification.StreamEnabled===false) {
            logger.debug(`Stream not enabled for table ${model.tableName}, therefore enabling`);
            const params: AWS.DynamoDB.UpdateTableInput = {
                TableName: model.tableName,
                StreamSpecification: {
                    StreamEnabled: true,
                    StreamViewType: 'NEW_IMAGE'
                }
            };
            await this.ddb.updateTable(params).promise();
        }

    }

    public async list(): Promise<EventSourceResourceList> {
        logger.debug(`eventSource.full.service list: in:`);

        const items = await this.eventSourceDao.list();
        // const model = this.eventSourceAssembler.toModelList(nodes);

        // TODO: refactor into assembler
        const r:EventSourceResourceList = {
            results:[]
        };
        items.forEach(i=> {
            const resource:EventSourceSummaryResource = {
                eventSourceId: expandDelimitedAttribute(i.pk)[1]
            };
            r.results.push(resource);
        });

        logger.debug(`eventSource.full.service list: exit:${JSON.stringify(r)}`);
        return r;
    }

    public async get(eventSourceId:string): Promise<EventSourceDetailResource> {
        logger.debug(`eventSource.full.service get: in: eventSourceId:${eventSourceId}`);

        ow(eventSourceId, ow.string.nonEmpty);

        const result  = await this.eventSourceDao.get(eventSourceId);
        logger.debug(`eventSource.full.service get: eventSource:${JSON.stringify(result)}`);

        let model:EventSourceDetailResource;
        if (result!==undefined ) {
            model = this.eventSourceAssembler.toResource(result);
        }

        logger.debug(`eventSource.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    // public async update(model: EventSourceResource) : Promise<string> {
    //     logger.debug(`eventSource.full.service update: in: model: ${JSON.stringify(model)}`);

    //     ow(model, ow.object.nonEmpty);

    //     const node = this.eventSourceAssembler.toNode(model);

    //     const id = await this.eventSourceDao.update(node);

    //     logger.debug(`eventSource.full.service update: exit: id: ${id}`);
    //     return id;

    // }

    // public async delete(eventSourceId:string) : Promise<void> {
    //     logger.debug(`eventSource.full.service delete: in: eventSourceId:${eventSourceId}`);

    //     ow(eventSourceId, ow.string.nonEmpty);

    //     const eventSource = await this.get(eventSourceId);
    //     if (eventSource===undefined) {
    //         throw new Error('NOT_FOUND');
    //     }

    //     await this.eventSourceDao.delete(eventSourceId);

    //     logger.debug(`eventSource.full.service delete: exit:`);

    // }

}
