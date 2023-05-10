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

import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { EventResource, EventResourceList } from './events.model';
import { EventsService, EventsServiceBase } from './events.service';

@injectable()
export class EventsLambdaService extends EventsServiceBase implements EventsService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.NOTIFICATIONS_API_FUNCTION_NAME;
    }

    async createEvent(
        eventSourceId: string,
        event: EventResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceEventsRelativeUrl(eventSourceId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(event);

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);

        const location = res.header['location'];
        return location?.split('/')[2];
    }

    async getEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<EventResource> {
        ow(eventId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventRelativeUrl(eventId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async deleteEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventRelativeUrl(eventId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async updateEvent(event: EventResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(event.eventId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventRelativeUrl(event.eventId))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(event);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async listEventsForEventSource(
        eventSourceId: string,
        count?: number,
        fromEventId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<EventResourceList> {
        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceEventsRelativeUrl(eventSourceId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        if (count && fromEventId) {
            ev.setQueryStringParameters({
                count: `${count}`,
                fromEventId,
            });
        }

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }
}
