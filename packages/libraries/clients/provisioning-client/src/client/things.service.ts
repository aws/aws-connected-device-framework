import {
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse, CertificateStatus,
    ProvisionThingRequest,
    ProvisionThingResponse, RequestHeaders,
    Thing,
} from './things.model';
import {PathHelper} from '../utils/path.helper';
import config from 'config';

export interface ThingsService {

    provisionThing(provisioningRequest: ProvisionThingRequest): Promise<ProvisionThingResponse>;

    getThing(thingName: string): Promise<Thing>;

    deleteThing(thingName: string): Promise<void>;

    bulkProvisionThings(req: BulkProvisionThingsRequest): Promise<BulkProvisionThingsResponse>;

    getBulkProvisionTask(taskId: string): Promise<BulkProvisionThingsResponse>;

    updateThingCertificates(thingName: string, certificateStatus: CertificateStatus): Promise<void>;
}

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

        let headers = this._headers;

        if (config.has('provisioning.headers')) {
            const headersFromConfig:RequestHeaders = config.get('provisioning.headers') as RequestHeaders;
            if (headersFromConfig !== null && headersFromConfig !== undefined) {
                headers = {...headers, ...headersFromConfig};
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = {...headers, ...additionalHeaders};
        }

        return headers;
    }
}
