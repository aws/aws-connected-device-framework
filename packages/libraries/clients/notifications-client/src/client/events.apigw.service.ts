/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

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

    async createEvent(eventSourceId: string, event: EventResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourceEventsRelativeUrl(eventSourceId)}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(event);
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
