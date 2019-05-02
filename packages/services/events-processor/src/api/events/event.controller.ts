/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This event code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpDelete} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger';
import {handleError} from '../../utils/errors';
import { EventService } from './event.service';
import { EventResource } from './event.models';

@controller('/events')
export class EventController implements interfaces.Controller {

    constructor( @inject(TYPES.EventService) private eventService: EventService) {}

    @httpPost('')
    public async createEvent(@requestBody() event:EventResource, @response() res: Response) {
        logger.debug(`event.controller createEvent: in: event:${JSON.stringify(event)}`);

        try {
            await this.eventService.create(event);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller createEvent: exit:`);
    }

    @httpGet('/:eventId')
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

    @httpDelete('/:eventId')
    public async deleteEvent(@requestParam('eventId') eventId:string, @response() res: Response): Promise<void> {

        logger.debug(`event.controller deleteEvent: eventId:${eventId}`);

        try {
            await this.eventService.delete(eventId);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller deleteEvent: exit:`);
    }

}
