/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import { injectable } from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import { EventSourceDetailResource, EventSourceResourceList } from './eventsources.model';


@injectable()
export class EventSourcesService {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('notifications.eventProcessor.baseUrl') as string;

        if (config.has('notifications.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('notifications.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async createEventSource(eventSource:EventSourceDetailResource): Promise<void> {
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}/eventsources`;
        await request.post(url)
            .set(this.headers)
            .send(eventSource);
    }

    public async listEventSources(): Promise<EventSourceResourceList> {
        const url = `${this.baseUrl}/eventsources`;
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async getEventSource(eventSourceId:string): Promise<EventSourceDetailResource> {

        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/eventsources/${eventSourceId}`;
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async updateEventSource(eventSourceId:string, eventSource: EventSourceDetailResource): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);
        ow(eventSource, ow.object.nonEmpty);

        const url = `${this.baseUrl}/eventsources/${eventSourceId}`;
        await request.patch(url)
            .set(this.headers)
            .send(eventSource);
    }

    public async deleteEventSource(eventSourceId:string): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/eventsources/${eventSourceId}`;
        await request.delete(url)
            .set(this.headers);
    }
}
