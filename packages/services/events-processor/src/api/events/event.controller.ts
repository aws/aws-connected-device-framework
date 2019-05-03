/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This event code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpDelete, queryParam} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger';
import {handleError} from '../../utils/errors';
import { EventService } from './event.service';
import { EventResource, EventResourceList } from './event.models';

@controller('')
export class EventController implements interfaces.Controller {

    constructor( @inject(TYPES.EventService) private eventService: EventService) {}

    @httpPost('/eventsources/:eventSourceId/events')
    public async createEvent(@requestParam('eventSourceId') eventSourceId:string, @requestBody() event:EventResource, @response() res: Response) {
        logger.debug(`event.controller createEvent: in: eventSourceId:${eventSourceId}, event:${JSON.stringify(event)}`);

        event.eventSourceId=eventSourceId;

        try {
            const eventId = await this.eventService.create(event);
            res.location(`/events/${eventId}`);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller createEvent: exit:`);
    }

    @httpGet('/events/:eventId')
    public async getEvent(@requestParam('eventId') eventId:string, @response() res: Response): Promise<EventResource> {

        logger.debug(`event.controller getEvent: eventId:${eventId}`);

        let model:EventResource;
        try {
            model = await this.eventService.get(eventId);
            if (model===undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller getEvent: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpDelete('/events/:eventId')
    public async deleteEvent(@requestParam('eventId') eventId:string, @response() res: Response): Promise<void> {

        logger.debug(`event.controller deleteEvent: eventId:${eventId}`);

        try {
            await this.eventService.delete(eventId);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller deleteEvent: exit:`);
    }

    @httpGet('/eventsources/:eventSourceId/events')
    public async listEventsForEventSource(@requestParam('eventSourceId') eventSourceId: string, @queryParam('fromEventId') fromEventId:string,
        @response() res: Response): Promise<EventResourceList> {

        logger.debug(`event.controller listEventsForEventSource: in: eventSourceId:${eventSourceId}, fromEventId:${fromEventId}`);

        let model;
        try {
            let from;
            if (fromEventId!==undefined && fromEventId.length>0) {
                from = {
                    eventSourceId,
                    eventId: fromEventId
                };
            }
            model = await this.eventService.listByEventSource(eventSourceId, from);

            if (model===undefined) {
                res.status(404).end();
            }

        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`event.controller listEventsForEventSource: exit: ${JSON.stringify(model)}`);
        return model;
    }

}
