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
import ow from 'ow';
import * as request from 'superagent';
import config from 'config';
import { SearchRequestModel, SearchResultsModel } from './search.model';
import { QSHelper } from '../utils/qs.helper';

@injectable()
export class SearchService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;

        if (config.has('assetLibrary.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('assetLibrary.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async search(searchRequest:SearchRequestModel, offset?:number, count?:number) : Promise<SearchResultsModel> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        let queryString = req.toQueryString();
        const queryString2 = QSHelper.getQueryString({offset, count});
        if (queryString2!==null) {
            queryString+= queryString2;
        }

        ow(queryString, ow.string.nonEmpty);

        const url = `${this.baseUrl}/search?${queryString}`;

        const res = await request.get(url)
        .set(this.headers);

        return res.body;

    }

}
