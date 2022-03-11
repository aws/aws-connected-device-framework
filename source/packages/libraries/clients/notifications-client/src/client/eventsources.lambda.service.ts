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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {EventSourceDetailResource, EventSourceResourceList} from './eventsources.model';
import {RequestHeaders} from './common.model';
import {EventsourcesService, EventsourcesServiceBase} from './eventsources.service';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class EventsourcesLambdaService extends EventsourcesServiceBase implements EventsourcesService {

    private functionName : string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.NOTIFICATIONS_API_FUNCTION_NAME;
    }

    async createEventSource(eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(eventSource, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSourcesRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(eventSource);

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);

        const location = res.header.location;
        return location?.split('/')[2];
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
