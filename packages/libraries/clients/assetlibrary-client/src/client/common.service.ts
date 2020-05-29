/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import { injectable } from 'inversify';
import config from 'config';
import {RequestHeaders} from './common.model';

@injectable()
export abstract class ClientServiceBase  {

    protected MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private _headers:RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected baseUrl:string;

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = this._headers;

        if (config.has('assetLibrary.headers')) {
            const headersFromConfig:RequestHeaders = config.get('assetLibrary.headers') as RequestHeaders;
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
