/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {EventResource, EventResourceList} from './events.model';
import {EventsService, EventsServiceBase} from './events.service';
import {RequestHeaders} from './common.model';
import {
    LambdaApiGatewayEventBuilder,
    LAMBDAINVOKE_TYPES,
    LambdaInvokerService,
} from '@cdf/lambda-invoke';

@injectable()
export class EventsLambdaService extends EventsServiceBase implements EventsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('notifications.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createEvent(eventSourceId: string, event: EventResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(event, ow.object.nonEmpty);
        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceEventsRelativeUrl(eventSourceId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(event);

        await this.lambdaInvoker.invoke(this.functionName, ev);
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

    async listEventsForEventSource(eventSourceId: string, count?: number, fromEventId?: string, additionalHeaders?: RequestHeaders): Promise<EventResourceList> {
        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceEventsRelativeUrl(eventSourceId))
            .setQueryStringParameters({
                count: `${count}`,
                fromEventId
            })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

}
