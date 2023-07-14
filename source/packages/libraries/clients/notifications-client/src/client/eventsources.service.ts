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

import { injectable } from 'inversify';
import { RequestHeaders } from './common.model';
import { CommonServiceBase } from './common.service';
import { EventSourceDetailResource, EventSourceResourceList } from './eventsources.model';

export interface EventsourcesService {
    createEventSource(
        eventSource: EventSourceDetailResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string>;

    listEventSources(additionalHeaders?: RequestHeaders): Promise<EventSourceResourceList>;

    getEventSource(
        eventSourceId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<EventSourceDetailResource>;

    updateEventSource(
        eventSourceId: string,
        eventSource: EventSourceDetailResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    deleteEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class EventsourcesServiceBase extends CommonServiceBase {
    protected eventSourcesRelativeUrl(): string {
        return `/eventsources`;
    }

    protected eventSourceRelativeUrl(eventSourceId: string): string {
        return `/eventsources/${eventSourceId}`;
    }
}
