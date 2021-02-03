/*-------------------------------------------------------------------------------
# Copyright (c) 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {  RequestHeaders, CertificateBatchTaskWithChunks } from './certificates.models';
import config from 'config';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface CertificatesService {
    getCertificates(taskId:string, downloadType:string, additionalHeaders?: RequestHeaders): Promise<string>;
    getCertificatesTask(taskId:string, additionalHeaders?: RequestHeaders): Promise<CertificateBatchTaskWithChunks>;

}

@injectable()
export class CertificatesServiceBase {

    protected MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected certificateRelativeUrl() : string {
        return '/certificates';
    }

    protected getCertificatesRelativeUrl(taskId:string) : string {
        return PathHelper.encodeUrl('certificates', taskId);
    }

    protected getCertificatesTaskRelativeUrl(taskId:string) : string {
        return PathHelper.encodeUrl('certificates', taskId,'task');
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
