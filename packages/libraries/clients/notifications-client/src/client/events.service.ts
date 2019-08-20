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
import { QSHelper } from '../utils/qs.helper';
import { EventResource, EventResourceList } from './events.model';


@injectable()
export class EventsService {

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

    public async createEvent(eventSourceId:string,event:EventResource): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/eventsources/${eventSourceId}/events`;
        await request.post(url)
            .set(this.headers)
            .send(event);
    }

    public async getEvent(eventId:string): Promise<EventResource> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/events/${eventId}`;
        const res = await request.get(url)
                .set(this.headers)
                .send(event);

        return res.body;
    }

    public async deleteEvent(eventId:string): Promise<void> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/events/${eventId}`;
        await request.delete(url)
            .set(this.headers)
            .send(event);
    }

    public async listEventsForEventSource(eventSourceId:string, count?:number, fromEventId?:string): Promise<EventResourceList> {
        ow(eventSourceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}/eventsources/${eventSourceId}/events`;
        const queryString = QSHelper.getQueryString({count, fromEventId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.get(url)
                .set(this.headers)
                .send(event);

        return res.body;
    }

}
