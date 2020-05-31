/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {SearchRequestModel, SearchResultsModel} from './search.model';
import {QSHelper} from '../utils/qs.helper';
import {RequestHeaders} from './common.model';
import {SearchService, SearchServiceBase} from './search.service';

@injectable()
export class SearchApigwService extends SearchServiceBase implements SearchService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    public async search(searchRequest:SearchRequestModel, offset?:number, count?:number, additionalHeaders?:RequestHeaders) : Promise<SearchResultsModel> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        let queryString = req.toHttpQueryString();
        const queryString2 = QSHelper.getQueryString({offset, count});
        if (queryString2!==null) {
            queryString+= queryString2;
        }

        ow(queryString, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.searchRelativeUrl()}?${queryString}`;

        const res = await request.get(url)
        .set(super.buildHeaders(additionalHeaders));

        return res.body;
    }
}
