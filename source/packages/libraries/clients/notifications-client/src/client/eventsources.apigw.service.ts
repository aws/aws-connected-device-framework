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
import { RequestHeaders } from './common.model';
import { EventSourceDetailResource, EventSourceResourceList } from './eventsources.model';
import { EventsourcesService, EventsourcesServiceBase } from './eventsources.service';

@injectable()
export class EventsourcesApigwService
    extends EventsourcesServiceBase
    implements EventsourcesService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async createEventSource(
        eventSource: EventSourceDetailResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourcesRelativeUrl()}`;
        return await request
            .post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(eventSource)
            .use(await signClientRequest())
            .then((res) => {
                const location = res.get('location');
                return location?.split('/')[2];
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listEventSources(additionalHeaders?: RequestHeaders): Promise<EventSourceResourceList> {
        const url = `${this.baseUrl}${super.eventSourcesRelativeUrl()}`;
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

    async getEventSource(
        eventSourceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<EventSourceDetailResource> {
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
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

    async updateEventSource(
        eventSourceId: string,
        eventSource: EventSourceDetailResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(eventSourceId, ow.string.nonEmpty);
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
        return await request
            .patch(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(eventSource)
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteEventSource(
        eventSourceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
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
}
