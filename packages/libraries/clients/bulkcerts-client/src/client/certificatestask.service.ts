/*-------------------------------------------------------------------------------
# Copyright (c) 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { CertificateBatchRequest, RequestHeaders } from './certificatestask.models';
import config from 'config';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface CertificatesTaskService {
    createCertificateTask(request:CertificateBatchRequest, caAlias:string, additionalHeaders?: RequestHeaders): Promise<string>;

}

@injectable()
export class CertificatesTaskServiceBase {

    protected MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected certificateTaskRelativeUrl() : string {
        return '/supplier';
    }

    protected certificateTaskCreateRelativeUrl(supplierId:string) : string {
        return PathHelper.encodeUrl('supplier', supplierId,'certificates');
    }

    protected buildHeaders(additionalHeaders:RequestHeaders): RequestHeaders {
        let headers = Object.assign({}, this._headers);

        if (config.has('bulkcerts.headers')) {
            const headersFromConfig:RequestHeaders = config.get('bulkcerts.headers') as RequestHeaders;
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
