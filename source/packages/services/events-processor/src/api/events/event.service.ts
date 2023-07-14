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
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { v1 as uuid } from 'uuid';
import { TYPES } from '../../di/types';
import { EventSourceDao } from '../eventsources/eventsource.dao';
import { PaginationKey } from '../subscriptions/subscription.dao';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { EventAssembler } from './event.assembler';
import { EventDao } from './event.dao';
import { EventResource, EventResourceList } from './event.models';

@injectable()
export class EventService {
    constructor(
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao,
        @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService,
        @inject(TYPES.EventAssembler) private eventAssembler: EventAssembler,
    ) {}

    public async create(resource: EventResource): Promise<string> {
        logger.debug(`event.service create: in: resource:${JSON.stringify(resource)}`);

        // validate input
        this.validateEvent(resource);

        // set defaults
        if (resource.eventId === undefined) {
            resource.eventId = uuid();
        }
        if (resource.enabled === undefined) {
            resource.enabled = true;
        }

        const existing = await this.eventDao.get(resource.eventId);
        if (existing !== undefined) {
            if (existing.id === resource.eventId) {
                throw new Error('DUPLICATE_EVENT_ID');
            }
        }

        // TODO: validate the conditions format

        const eventSource = await this.eventSourceDao.get(resource.eventSourceId);
        logger.debug(`event.service create: eventSource: ${JSON.stringify(eventSource)}`);
        if (eventSource === undefined) {
            throw new Error('EVENT_SOURCE_NOT_FOUND');
        }

        const item = this.eventAssembler.toItem(resource, eventSource.principal);
        await this.eventDao.save(item);

        logger.debug(`event.service create: exit:${resource.eventId}`);
        return resource.eventId;
    }

    private validateEvent(resource: EventResource) {
        ow(resource, 'resource', ow.object.nonEmpty);
        ow(resource.eventSourceId, ow.string.nonEmpty);
        ow(resource.name, ow.string.nonEmpty);
        ow(resource.conditions, ow.object.nonEmpty);
        if (resource.supportedTargets !== undefined) {
            for (const key of Object.keys(resource.supportedTargets)) {
                ow(resource.supportedTargets[key], ow.string.nonEmpty);
                ow(resource.templates, ow.object.hasKeys(resource.supportedTargets[key]));
                ow(resource.templates[resource.supportedTargets[key]], ow.string.nonEmpty);
            }
        }
    }

    public async update(resource: EventResource): Promise<void> {
        logger.debug(`event.service update: in: resource:${JSON.stringify(resource)}`);

        // validate input
        ow(resource.eventId, ow.string.nonEmpty);

        // not allowing change...
        ow(resource.eventSourceId, ow.undefined);

        // get existing
        const existing = await this.eventDao.get(resource.eventId);
        if (existing === undefined) {
            logger.debug(`event.service update: exit: undefined`);
            return undefined;
        }

        // merge changes
        logger.debug(`>>>>> existing:${JSON.stringify(existing)}`);

        const updated = this.eventAssembler.toItem(resource);
        logger.debug(`>>>>> updated:${JSON.stringify(updated)}`);

        const merged = Object.assign(
            existing,
            Object.fromEntries(Object.entries(updated).filter(([_k, v]) => v !== undefined)),
        );
        logger.debug(`>>>>> merged:${JSON.stringify(merged)}`);

        await this.eventDao.save(merged);

        logger.debug(`event.service update: exit:`);
    }

    public async get(eventId: string): Promise<EventResource> {
        logger.debug(`event.service get: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        const result = await this.eventDao.get(eventId);
        logger.debug(`event.service get: eventSource:${JSON.stringify(result)}`);

        let model: EventResource;
        if (result !== undefined) {
            model = this.eventAssembler.toResource(result);
        }

        logger.debug(`event.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async delete(eventId: string): Promise<void> {
        logger.debug(`event.service delete: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        // find and delete all affected subscriptions
        let [subscriptions, paginationKey] = await this.subscriptionService.listByEvent(eventId);
        while (subscriptions?.length > 0) {
            for (const sub of subscriptions) {
                await this.subscriptionService.delete(sub.id);
            }
            if (paginationKey !== undefined) {
                [subscriptions, paginationKey] = await this.subscriptionService.listByEvent(
                    eventId,
                    paginationKey,
                );
            } else {
                break;
            }
        }

        // delete the event
        await this.eventDao.delete(eventId);

        logger.debug(`event.service delete: exit:`);
    }

    public async listByEventSource(
        eventSourceId: string,
        count?: number,
        from?: PaginationKey,
    ): Promise<EventResourceList> {
        logger.debug(
            `event.service listByEventSource: in: eventSourceId:${eventSourceId}, count:${count}, from:${JSON.stringify(
                from,
            )}`,
        );

        ow(eventSourceId, ow.string.nonEmpty);

        const results = await this.eventDao.listEventsForEventSource(eventSourceId, count, from);

        let model: EventResourceList;
        if (results !== undefined) {
            model = this.eventAssembler.toResourceList(results[0], count, results[1]);
        }

        logger.debug(`event.service listByEventSource: exit: model: ${JSON.stringify(model)}`);
        return model;
    }
}
