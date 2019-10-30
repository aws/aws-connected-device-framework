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
import { SearchRequestModel, SearchResultsModel } from './search.model';
import { QSHelper } from '../utils/qs.helper';
import { ClientService, ClientOptions } from './common.service';

@injectable()
export class SearchService extends ClientService {

    public constructor(options?:ClientOptions) {
        super(options);
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
        .set(super.getHeaders());

        return res.body;

    }

}
