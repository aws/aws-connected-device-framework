/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This eventSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger.util';
import ow from 'ow';
import { EventSourceType, EventSourceResourceList, EventSourceDetailResource, EventSourceSummaryResource } from './eventsource.models';
import { EventSourceDao } from './eventsource.dao';
import { EventSourceAssembler } from './eventsource.assembler';
import { EventService } from '../events/event.service';
import { DynamoDbEventSource } from './sources/dynamodb.source';
import { IotCoreEventSource } from './sources/iotcore.source';

@injectable()
export class EventSourceService  {

    constructor(
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao,
        @inject(TYPES.EventSourceAssembler) private eventSourceAssembler: EventSourceAssembler,
        @inject(TYPES.DynamoDbEventSource) private dynamoDbEventSource: DynamoDbEventSource,
        @inject(TYPES.IotCoreEventSource) private iotCoreEventSource: IotCoreEventSource,
        @inject(TYPES.EventService) private eventService: EventService) {
        }

    public async create(resource:EventSourceDetailResource) : Promise<string> {
        logger.debug(`eventSource.service create: in: model:${JSON.stringify(resource)}`);

        // validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.name, ow.string.nonEmpty);
        ow(resource.sourceType, ow.string.nonEmpty);
        ow(resource.principal, ow.string.nonEmpty);

        // enable by default
        if (resource.enabled===undefined) {
            resource.enabled = true;
        }

        switch (resource.sourceType) {
            case EventSourceType.DynamoDB:
                await this.dynamoDbEventSource.create(resource);
                break;
            case EventSourceType.IoTCore:
                await this.iotCoreEventSource.create(resource);
                break;
            default:
                throw new Error('NOT_IMPLEMENTED');
        }

        const item = this.eventSourceAssembler.toItem(resource);
        await this.eventSourceDao.create(item);

        logger.debug(`eventSource.service create: exit:${item.id}`);
        return item.id;
    }

    public async delete(eventSourceId:string):Promise<void> {
        logger.debug(`eventSource.service delete: in: eventSourceId:${eventSourceId}`);

        // validate input
        ow(eventSourceId, ow.string.nonEmpty);

        // get the eventsource info
        const eventSource = await this.get(eventSourceId);
        if (eventSource===undefined) {
            logger.warn(`eventSource.service delete: EventSourceId ${eventSourceId} does not exist.`);
            return;
        }

        // find and delete all affected events
        let events = await this.eventService.listByEventSource(eventSourceId);
        while (events!==undefined && events.results.length>0) {
            for(const ev of events.results) {
                await this.eventService.delete(ev.eventId);
            }
            if (events.pagination!==undefined) {
                events = await this.eventService.listByEventSource(eventSourceId, 25, events.pagination.offset);
            } else {
                break;
            }
        }

        // delete the physical event source
        switch (eventSource.sourceType) {
            case EventSourceType.DynamoDB:
                await this.dynamoDbEventSource.delete(eventSourceId);
                break;
            case EventSourceType.IoTCore:
                await this.iotCoreEventSource.delete(eventSourceId);
                break;
            default:
                throw new Error('NOT_IMPLEMENTED');
        }

        // delete the event source data
        await this.eventSourceDao.delete(eventSourceId);

        logger.debug(`eventSource.service delete: exit:`);
    }

    public async list(): Promise<EventSourceResourceList> {
        logger.debug(`eventSource.service list: in:`);

        const items = await this.eventSourceDao.list();

        const r:EventSourceResourceList = {
            results:[]
        };
        items.forEach(i=> {
            const resource:EventSourceSummaryResource = {
                id: i.id,
                name: i.name
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
