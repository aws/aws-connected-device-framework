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
import {EventResource, EventResourceList} from './events.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';
import {CommonServiceBase} from './common.service';

export interface EventsService {
    createEvent(eventSourceId: string, event: EventResource, additionalHeaders?: RequestHeaders): Promise<string>;

    getEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<EventResource>;

    deleteEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    updateEvent(event: EventResource, additionalHeaders?: RequestHeaders): Promise<void>;

    listEventsForEventSource(eventSourceId: string, count?: number, fromEventId?: string, additionalHeaders?: RequestHeaders): Promise<EventResourceList>;
}

@injectable()
export class EventsServiceBase extends CommonServiceBase  {

    protected eventSourceEventsRelativeUrl(eventSourceId: string): string {
        return `/eventsources/${eventSourceId}/events`;
    }

    protected eventRelativeUrl(eventId: string): string {
        return `/events/${eventId}`;
    }
}
