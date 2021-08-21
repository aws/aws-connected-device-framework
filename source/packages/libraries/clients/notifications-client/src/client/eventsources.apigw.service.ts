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
import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {EventSourceDetailResource, EventSourceResourceList} from './eventsources.model';
import {RequestHeaders} from './common.model';
import {EventsourcesService, EventsourcesServiceBase} from './eventsources.service';

@injectable()
export class EventsourcesApigwService extends EventsourcesServiceBase implements EventsourcesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async createEventSource(eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourcesRelativeUrl()}`;
        const res = await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(eventSource);
        const location = res.get('location');
        return location?.split('/')[2];
    }

    async listEventSources(additionalHeaders?: RequestHeaders): Promise<EventSourceResourceList> {
        const url = `${this.baseUrl}${super.eventSourcesRelativeUrl()}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<EventSourceDetailResource> {

        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateEventSource(eventSourceId: string, eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
        await request.patch(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(eventSource);
    }

    async deleteEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceRelativeUrl(eventSourceId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }
}
