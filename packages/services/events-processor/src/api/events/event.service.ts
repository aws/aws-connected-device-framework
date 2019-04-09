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
        logger.debug(`event.full.service create: in: model:${JSON.stringify(resource)}`);

        // validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.eventSourceId, ow.string.nonEmpty);
        ow(resource.name, ow.string.nonEmpty);
        ow(resource.ruleDefinition, ow.string.nonEmpty);

        resource.eventId = uuid();

        // enable by default
        if (resource.enabled===undefined) {
            resource.enabled = true;
        }

        // TODO: validate the ruleDefinition format.  regex?

        // TODO: extract ruleParameters from ruleDefinition

        const eventSource = await this.eventSourceService.get(resource.eventSourceId);
        logger.debug(`event.full.service create: eventSource: ${JSON.stringify(eventSource)}`);
        if (eventSource===undefined) {
            throw new Error('EVENT_SOURCE_NOT_FOUND');
        }

        const [item, typeGsiSort] = this.eventAssembler.toItem(resource, eventSource.principal);
        await this.eventDao.create(item,typeGsiSort);

        logger.debug(`event.full.service create: exit:`);

    }

    public async get(eventId:string): Promise<EventResource> {
        logger.debug(`event.full.service get: in: eventId:${eventId}`);

        ow(eventId, ow.string.nonEmpty);

        const result  = await this.eventDao.get(eventId);
        logger.debug(`event.full.service get: eventSource:${JSON.stringify(result)}`);

        let model:EventResource;
        if (result!==undefined ) {
            model = this.eventAssembler.toResource(result);
        }

        logger.debug(`event.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

}
