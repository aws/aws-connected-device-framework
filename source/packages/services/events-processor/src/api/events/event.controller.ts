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
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpDelete, queryParam, httpPatch} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger.util';
import {handleError} from '../../utils/errors.util';
import { EventService } from './event.service';
import { EventResource, EventResourceList } from './event.models';

@controller('')
export class EventController implements interfaces.Controller {

    constructor( @inject(TYPES.EventService) private eventService: EventService) {}

    @httpPost('/eventsources/:eventSourceId/events')
    public async createEvent(@requestParam('eventSourceId') eventSourceId:string, @requestBody() event:EventResource, @response() res: Response) : Promise<void> {
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
    public async listEventsForEventSource(@requestParam('eventSourceId') eventSourceId: string, @queryParam('count') count:number, @queryParam('fromEventId') fromEventId:string,
        @response() res: Response): Promise<EventResourceList> {

        logger.debug(`event.controller listEventsForEventSource: in: eventSourceId:${eventSourceId}, count:${count}, fromEventId:${fromEventId}`);

        let model;
        try {
            let from;
            if (fromEventId!==undefined && fromEventId.length>0) {
                from = {
                    eventSourceId,
                    eventId: fromEventId
                };
            }
            model = await this.eventService.listByEventSource(eventSourceId, count, from);

            if (model===undefined) {
                res.status(404).end();
            }

        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`event.controller listEventsForEventSource: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpPatch('/events/:eventId')
    public async updateEvent(@requestParam('eventId') eventId:string, @requestBody() event: EventResource, @response() res: Response) : Promise<void> {


        logger.debug(`event.controller updateEvent: event:${JSON.stringify(event)}, eventId:${eventId}`);

        event.eventId=eventId;
        try {
            await this.eventService.update(event);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`event.controller updateEvent: exit:`);
    }

}
