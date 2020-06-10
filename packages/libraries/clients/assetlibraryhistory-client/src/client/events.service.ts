import {Category, CategoryEventsRequest, Events, ObjectEventsRequest, RequestHeaders} from './events.model';
import config from 'config';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface EventsService {
    listObjectEvents(req: ObjectEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listDeviceEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listGroupEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listDeviceTemplateEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listGroupTemplateEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listPolicyEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;

    listCategoryEvents(category: Category, req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events>;
}

@injectable()
export class EventsServiceBase {

    protected MIME_TYPE: string = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected objectEventsRelativeUrl(category:string, objectId:string) : string {
        return PathHelper.encodeUrl(category, objectId);
    }

    protected eventsRelativeUrl(category:string) : string {
        return PathHelper.encodeUrl(category);
    }

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = Object.assign({}, this._headers);

        if (config.has('assetLibraryHistory.headers')) {
            const headersFromConfig:RequestHeaders = config.get('assetLibraryHistory.headers') as RequestHeaders;
            if (headersFromConfig !== null && headersFromConfig !== undefined) {
                headers = {...headers, ...headersFromConfig};
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = {...headers, ...additionalHeaders};
        }

        const keys = Object.keys(headers);
        keys.forEach(k=> {
            if (headers[k]===undefined || headers[k]===null) {
                delete headers[k];
            }
        });

        return headers;
    }

}
