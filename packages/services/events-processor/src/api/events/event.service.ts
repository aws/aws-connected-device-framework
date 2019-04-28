/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This event code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger';
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import { EventResource } from './event.models';
import { EventAssembler } from './event.assembler';
import { EventSourceService } from '../eventsources/eventsource.service';
import { EventDao } from './event.dao';

@injectable()
export class EventService  {

    constructor(
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.EventSourceService) private eventSourceService: EventSourceService,
        @inject(TYPES.EventAssembler) private eventAssembler: EventAssembler) {
        }

    public async create(resource:EventResource) : Promise<void> {
        logger.debug(`event.service create: in: resource:${JSON.stringify(resource)}`);

        // validate input
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
        
        // set defaults
        resource.eventId = uuid();
        if (resource.enabled===undefined) {
            resource.enabled = true;
        }

        // TODO: validate the conditions format

        // TODO: extract ruleParameters from ruleDefinition

        const eventSource = await this.eventSourceService.get(resource.eventSourceId);
        logger.debug(`event.service create: eventSource: ${JSON.stringify(eventSource)}`);
        if (eventSource===undefined) {
            throw new Error('EVENT_SOURCE_NOT_FOUND');
        }

        const item = this.eventAssembler.toItem(resource, eventSource.principal);
        await this.eventDao.create(item);

        logger.debug(`event.service create: exit:`);

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

}
