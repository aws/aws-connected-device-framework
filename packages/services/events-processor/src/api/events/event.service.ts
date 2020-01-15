/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This event code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger.util';
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import { EventResource, EventResourceList} from './event.models';
import { EventAssembler } from './event.assembler';
import { EventDao } from './event.dao';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { PaginationKey } from '../subscriptions/subscription.dao';
import { EventSourceDao } from '../eventsources/eventsource.dao';

@injectable()
export class EventService  {

    constructor(
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao,
        @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService,
        @inject(TYPES.EventAssembler) private eventAssembler: EventAssembler) {
        }

    public async create(resource:EventResource) : Promise<string> {
        logger.debug(`event.service create: in: resource:${JSON.stringify(resource)}`);

        // validate input
        this.validateEvent(resource);

        // set defaults
        resource.eventId = uuid();
        if (resource.enabled===undefined) {
            resource.enabled = true;
        }

        // TODO: validate the conditions format

        const eventSource = await this.eventSourceDao.get(resource.eventSourceId);
        logger.debug(`event.service create: eventSource: ${JSON.stringify(eventSource)}`);
        if (eventSource===undefined) {
            throw new Error('EVENT_SOURCE_NOT_FOUND');
        }

        const item = this.eventAssembler.toItem(resource, eventSource.principal);
        await this.eventDao.save(item);

        logger.debug(`event.service create: exit:${resource.eventId}`);
        return resource.eventId;

    }

    private validateEvent(resource:EventResource) {
        ow(resource, ow.object.nonEmpty);
        ow(resource.eventSourceId, ow.string.nonEmpty);
        ow(resource.name, ow.string.nonEmpty);
        ow(resource.conditions, ow.object.nonEmpty);
        if (resource.supportedTargets!==undefined) {
            for (const key of Object.keys(resource.supportedTargets)) {
                ow(resource.supportedTargets[key], ow.string.nonEmpty);
                ow(resource.templates, ow.object.hasKeys(resource.supportedTargets[key]));
                ow(resource.templates[resource.supportedTargets[key]], ow.string.nonEmpty);
            }
        }
    }

    public async update(resource:EventResource) : Promise<void> {
        logger.debug(`event.service update: in: resource:${JSON.stringify(resource)}`);

        // validate input
        this.validateEvent(resource);
        ow(resource.eventId, ow.string.nonEmpty);

        // TODO: validate the conditions format

        const eventSource = await this.eventSourceDao.get(resource.eventSourceId);
        logger.debug(`event.service update: eventSource: ${JSON.stringify(eventSource)}`);
        if (eventSource===undefined) {
            throw new Error('EVENT_SOURCE_NOT_FOUND');
        }

        const item = this.eventAssembler.toItem(resource, eventSource.principal);
        await this.eventDao.save(item);

        logger.debug(`event.service update: exit:${resource.eventId}`);

    }

    public async get(eventId:string): Promise<EventResource> {
        logger.debug(`event.service get: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        const result  = await this.eventDao.get(eventId);
        logger.debug(`event.service get: eventSource:${JSON.stringify(result)}`);

        let model:EventResource;
        if (result!==undefined ) {
            model = this.eventAssembler.toResource(result);
        }

        logger.debug(`event.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async delete(eventId:string): Promise<void> {
        logger.debug(`event.service delete: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        // find and delete all affected subscriptions
        let subscriptions = await this.subscriptionService.listByEvent(eventId);
        while (subscriptions!==undefined && subscriptions.results.length>0) {
            for(const sub of subscriptions.results) {
                await this.subscriptionService.delete(sub.id);
            }
            if (subscriptions.pagination!==undefined) {
                subscriptions = await this.subscriptionService.listByEvent(eventId, subscriptions.pagination.offset);
            } else {
                break;
            }
        }

        // delete the event
        await this.eventDao.delete(eventId);

        logger.debug(`event.service delete: exit:`);
    }

    public async listByEventSource(eventSourceId:string, count?:number, from?:PaginationKey) : Promise<EventResourceList> {
        logger.debug(`event.service listByEventSource: in: eventSourceId:${eventSourceId}, count:${count}, from:${JSON.stringify(from)}`);

        ow(eventSourceId, ow.string.nonEmpty);

        const results = await this.eventDao.listEventsForEventSource(eventSourceId, count, from);

        let model:EventResourceList;
        if (results!==undefined) {
            model = this.eventAssembler.toResourceList(results[0], count, results[1]);
        }

        logger.debug(`event.service listByEventSource: exit: model: ${JSON.stringify(model)}`);
        return model;
    }
}
