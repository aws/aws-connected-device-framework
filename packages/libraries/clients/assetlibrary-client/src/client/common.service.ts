/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import { injectable } from 'inversify';
import config from 'config';

@injectable()
export abstract class ClientService  {

    private DEFAULT_MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    protected baseUrl:string;

    protected headers:{[key:string]:string};
    private additionalHeaders:{[key:string]:string};
    private mimeType:string;
    private authToken:string;

    protected constructor() {

        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
        if (config.has('assetLibrary.headers')) {
            this.additionalHeaders = config.get('assetLibrary.headers') as {[key:string]:string};
        }

        this.mimeType=this.DEFAULT_MIME_TYPE;
    }

    public init(options:ClientOptions) {
        if (options.mimeType) {
            this.mimeType=options.mimeType;
        }
        this.setAuthToken(options.authToken);
        this.getHeaders();
    }

    public setAuthToken(authToken?:string) {
        this.authToken=authToken;
        this.getHeaders();
    }

    protected getHeaders(): {[key:string]:string} {
        if (this.headers===undefined) {
            const h = {
                'Accept': this.mimeType,
                'Content-Type': this.mimeType
            };
            if (this.authToken!==undefined) {
                h['Authorization'] = `Bearer ${this.authToken}`;
            }
            this.headers = {...h, ...this.additionalHeaders};
        }
        return this.headers;
    }
}

@injectable()
export class ClientOptions {
    mimeType?:string;
    authToken?:string;
}
