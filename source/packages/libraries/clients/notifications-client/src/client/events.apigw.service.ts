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
import {QSHelper} from '../utils/qs.helper';
import {EventResource, EventResourceList} from './events.model';
import {EventsService, EventsServiceBase} from './events.service';
import {RequestHeaders} from './common.model';

@injectable()
export class EventsApigwService extends EventsServiceBase implements EventsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async createEvent(eventSourceId: string, event: EventResource, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceEventsRelativeUrl(eventSourceId)}`;
        const res = await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(event);
        const location = res.get('location');
        return location?.split('/')[2];
    }

    async getEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<EventResource> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(eventId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(eventId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async updateEvent(event: EventResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(event.eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventRelativeUrl(event.eventId)}`;
        await request.patch(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(event);
    }

    async listEventsForEventSource(eventSourceId: string, count?: number, fromEventId?: string, additionalHeaders?: RequestHeaders): Promise<EventResourceList> {
        ow(eventSourceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.eventSourceEventsRelativeUrl(eventSourceId)}`;
        const queryString = QSHelper.getQueryString({count, fromEventId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

}
