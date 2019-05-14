/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This eventSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpPatch, httpDelete} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger.util';
import {handleError} from '../../utils/errors.util';
import { EventSourceDetailResource, EventSourceResourceList } from './eventsource.models';
import { EventSourceService } from './eventsource.service';

@controller('/eventsources')
export class EventSourceController implements interfaces.Controller {

    constructor( @inject(TYPES.EventSourceService) private eventSourceService: EventSourceService) {}

    @httpPost('')
    public async createEventSource(@requestBody() eventSource:EventSourceDetailResource, @response() res: Response) {
        logger.debug(`eventSource.controller createEventSource: in: eventSource:${JSON.stringify(eventSource)}`);

        try {
            const eventId = await this.eventSourceService.create(eventSource);
            res.location(`/eventsources/${eventId}`);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`eventSource.controller createEventSource: exit:`);
    }

    @httpGet('')
    public async listEventSources(@response() res: Response): Promise<EventSourceResourceList> {

        logger.debug(`eventSource.controller listEventSources: in:`);

        let model: EventSourceResourceList;

        try {
            model = await this.eventSourceService.list();

            if (model===undefined) {
                res.status(404).end();
            }

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`eventSource.controller listEventSources: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpGet('/:eventSourceId')
    public async getEventSource(@requestParam('eventSourceId') eventSourceId:string, @response() res: Response): Promise<EventSourceDetailResource> {

        logger.debug(`eventSource.controller getEventSource: eventSourceId:${eventSourceId}`);

        let model:EventSourceDetailResource;
        try {
            model = await this.eventSourceService.get(eventSourceId);
            if (model===undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`eventSource.controller getEventSource: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpPatch('/:eventSourceId')
    public async updateEventSource(@requestParam('eventSourceId') eventSourceId:string, @requestBody() eventSource: EventSourceDetailResource,
        @response() _res: Response) {

        logger.debug(`eventSource.controller updateEventSource: eventSource:${JSON.stringify(eventSource)}, eventSourceId:${eventSourceId}`);

        throw new Error ('NOT_IMPLEMENTED');
    }

    @httpDelete('/:eventSourceId')
    public async deleteEventSource(@requestParam('eventSourceId') eventSourceId:string, @response() res: Response) {

        logger.debug(`eventSource.controller deleteEventSource: eventSourceId:${eventSourceId}`);

        try {
            await this.eventSourceService.delete(eventSourceId);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`eventSource.controller deleteEventSource: exit:`);
    }
}
