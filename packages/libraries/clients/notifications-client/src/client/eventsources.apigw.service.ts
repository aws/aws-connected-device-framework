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

    async createEventSource(eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSourcesRelativeUrl()}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(eventSource);
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
