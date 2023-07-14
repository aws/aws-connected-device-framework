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
import { RequestHeaders } from './common.model';

@injectable()
export abstract class ClientServiceBase {
    protected MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';

    private readonly _headers: RequestHeaders = {
        Accept: this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE,
    };

    protected buildHeaders(additionalHeaders: RequestHeaders): RequestHeaders {
        let headers: RequestHeaders = Object.assign({}, this._headers);

        const customHeaders = process.env.GREENGRASSPROVISIONING2_HEADERS;
        if (customHeaders !== undefined) {
            try {
                const headersFromConfig: RequestHeaders = JSON.parse(
                    customHeaders,
                ) as unknown as RequestHeaders;
                headers = { ...headers, ...headersFromConfig };
            } catch (err) {
                const wrappedErr = `Failed to parse configuration parameter GREENGRASSPROVISIONING2_HEADERS as JSON with error: ${err}`;
                console.log(wrappedErr);
                throw new Error(wrappedErr);
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = { ...headers, ...additionalHeaders };
        }

        const keys = Object.keys(headers);
        keys.forEach((k) => {
            if (headers[k] === undefined || headers[k] === null) {
                delete headers[k];
            }
        });

        return headers;
    }
}
