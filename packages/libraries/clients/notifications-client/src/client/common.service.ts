import {injectable} from 'inversify';
import config from 'config';
import {RequestHeaders} from './common.model';

@injectable()
export class CommonServiceBase  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private readonly _headers:RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = Object.assign({}, this._headers);

        if (config.has('notifications.headers')) {
            const headersFromConfig:RequestHeaders = config.get('notifications.headers') as RequestHeaders;
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
