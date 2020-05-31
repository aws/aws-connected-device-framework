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
import {EventSourceDetailResource, EventSourceResourceList} from './eventsources.model';
import {RequestHeaders} from './common.model';
import {EventsourcesService, EventsourcesServiceBase} from './eventsources.service';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class EventsourcesLambdaService extends EventsourcesServiceBase implements EventsourcesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('notifications.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createEventSource(eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventSource, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourcesRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(eventSource);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async listEventSources(additionalHeaders?: RequestHeaders): Promise<EventSourceResourceList> {
        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourcesRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async getEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<EventSourceDetailResource> {

        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceRelativeUrl(eventSourceId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async updateEventSource(eventSourceId: string, eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);
        ow(eventSource, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceRelativeUrl(eventSourceId))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(eventSource);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async deleteEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(eventSourceId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourceRelativeUrl(eventSourceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }
}
