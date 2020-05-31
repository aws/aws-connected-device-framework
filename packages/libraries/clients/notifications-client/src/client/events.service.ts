import {EventResource, EventResourceList} from './events.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';
import {CommonServiceBase} from './common.service';

export interface EventsService {
    createEvent(eventSourceId: string, event: EventResource, additionalHeaders?: RequestHeaders): Promise<void>;

    getEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<EventResource>;

    deleteEvent(eventId: string, additionalHeaders?: RequestHeaders): Promise<void>;

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
