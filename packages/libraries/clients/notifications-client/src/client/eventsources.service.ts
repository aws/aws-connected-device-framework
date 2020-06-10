import {EventSourceDetailResource, EventSourceResourceList} from './eventsources.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';
import {CommonServiceBase} from './common.service';

export interface EventsourcesService {
    createEventSource(eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void>;

    listEventSources(additionalHeaders?: RequestHeaders): Promise<EventSourceResourceList>;

    getEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<EventSourceDetailResource>;

    updateEventSource(eventSourceId: string, eventSource: EventSourceDetailResource, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteEventSource(eventSourceId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class EventsourcesServiceBase extends CommonServiceBase  {

    protected eventSourcesRelativeUrl(): string {
        return `/eventsources`;
    }

    protected eventSourceRelativeUrl(eventSourceId: string): string {
        return `/eventsources/${eventSourceId}`;
    }

}
