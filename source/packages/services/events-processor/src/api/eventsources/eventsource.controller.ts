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
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    interfaces,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../../di/types';
import { handleError } from '../../utils/errors.util';
import { EventSourceDetailResource, EventSourceResourceList } from './eventsource.models';
import { EventSourceService } from './eventsource.service';

@controller('/eventsources')
export class EventSourceController implements interfaces.Controller {
    constructor(
        @inject(TYPES.EventSourceService) private eventSourceService: EventSourceService,
    ) {}

    @httpPost('')
    public async createEventSource(
        @requestBody() eventSource: EventSourceDetailResource,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `eventSource.controller createEventSource: in: eventSource:${JSON.stringify(
                eventSource,
            )}`,
        );

        try {
            const eventSourceId = await this.eventSourceService.create(eventSource);
            res.location(`/eventsources/${eventSourceId}`);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`eventSource.controller createEventSource: exit:`);
    }

    @httpGet('')
    public async listEventSources(@response() res: Response): Promise<EventSourceResourceList> {
        logger.debug(`eventSource.controller listEventSources: in:`);

        let model: EventSourceResourceList;

        try {
            model = await this.eventSourceService.list();

            if (model === undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`eventSource.controller listEventSources: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpGet('/:eventSourceId')
    public async getEventSource(
        @requestParam('eventSourceId') eventSourceId: string,
        @response() res: Response,
    ): Promise<EventSourceDetailResource> {
        logger.debug(`eventSource.controller getEventSource: eventSourceId:${eventSourceId}`);

        let model: EventSourceDetailResource;
        try {
            model = await this.eventSourceService.get(eventSourceId);
            if (model === undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`eventSource.controller getEventSource: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpPatch('/:eventSourceId')
    public async updateEventSource(
        @requestParam('eventSourceId') eventSourceId: string,
        @requestBody() eventSource: EventSourceDetailResource,
        @response() _res: Response,
    ): Promise<void> {
        logger.debug(
            `eventSource.controller updateEventSource: eventSource:${JSON.stringify(
                eventSource,
            )}, eventSourceId:${eventSourceId}`,
        );

        throw new Error('NOT_IMPLEMENTED');
    }

    @httpDelete('/:eventSourceId')
    public async deleteEventSource(
        @requestParam('eventSourceId') eventSourceId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(`eventSource.controller deleteEventSource: eventSourceId:${eventSourceId}`);

        try {
            await this.eventSourceService.delete(eventSourceId);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`eventSource.controller deleteEventSource: exit:`);
    }
}
