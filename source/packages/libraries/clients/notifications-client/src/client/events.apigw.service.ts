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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { EventResource, EventResourceList } from './events.model';
import { EventsService, EventsServiceBase } from './events.service';

@injectable()
export class EventsApigwService extends EventsServiceBase implements EventsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async createEvent(
        eventSourceId: string,
        event: EventResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceEventsRelativeUrl(eventSourceId)}`;
        return await request
            .post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(event)
            .use(await signClientRequest())
            .then((res) => {
                const location = res.get('location');
                return location?.split('/')[2];
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<EventResource> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(eventId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(eventId)}`;
        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateEvent(event: EventResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(event.eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(event.eventId)}`;
        return await request
            .patch(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(event)
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listEventsForEventSource(
        eventSourceId: string,
        count?: number,
        fromEventId?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<EventResourceList> {
        ow(eventSourceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.eventSourceEventsRelativeUrl(eventSourceId)}`;
        const queryString = QSHelper.getQueryString({ count, fromEventId });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
