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

import { PathHelper } from '../utils/path.helper';
import {
    CertificateBatchRequest, CertificateBatchTask, RequestHeaders
} from './certificatestask.models';

export interface CertificatesTaskService {
    createCertificateTask(request:CertificateBatchRequest, caAlias:string, additionalHeaders?: RequestHeaders): Promise<CertificateBatchTask>;

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

        const headersFromConfig:RequestHeaders = process.env.BULKCERTS_HEADERS as unknown as RequestHeaders;
        if (headersFromConfig) {
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
