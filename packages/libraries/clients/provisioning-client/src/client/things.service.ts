import {
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse, CertificateStatus,
    ProvisionThingRequest,
    ProvisionThingResponse, RequestHeaders,
    Thing,
} from './things.model';
import {PathHelper} from '../utils/path.helper';
import config from 'config';
import {injectable} from 'inversify';

export interface ThingsService {

    provisionThing(provisioningRequest: ProvisionThingRequest, additionalHeaders?:RequestHeaders): Promise<ProvisionThingResponse>;

    getThing(thingName: string, additionalHeaders?:RequestHeaders): Promise<Thing>;

    deleteThing(thingName: string, additionalHeaders?:RequestHeaders): Promise<void>;

    bulkProvisionThings(req: BulkProvisionThingsRequest, additionalHeaders?:RequestHeaders): Promise<BulkProvisionThingsResponse>;

    getBulkProvisionTask(taskId: string, additionalHeaders?:RequestHeaders): Promise<BulkProvisionThingsResponse>;

    updateThingCertificates(thingName: string, certificateStatus: CertificateStatus, additionalHeaders?:RequestHeaders): Promise<void>;
}

@injectable()
export class ThingsServiceBase {

    protected MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers:RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected thingsRelativeUrl() : string {
        return '/things';
    }

    protected thingRelativeUrl(thingName:string) : string {
        return `/things/${PathHelper.encodeUrl(thingName)}`;
    }

    protected bulkThingsRelativeUrl() : string {
        return '/bulkthings';
    }

    protected bulkThingsTaskRelativeUrl(taskId:string) : string {
        return `/bulkthings/${PathHelper.encodeUrl(taskId)}`;
    }

    protected thingCertificateRelativeUrl(thingName:string) : string {
        return `/things/${PathHelper.encodeUrl(thingName)}/certificates`;
    }

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = Object.assign({}, this._headers);

        if (config.has('provisioning.headers')) {
            const headersFromConfig:RequestHeaders = config.get('provisioning.headers') as RequestHeaders;
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
