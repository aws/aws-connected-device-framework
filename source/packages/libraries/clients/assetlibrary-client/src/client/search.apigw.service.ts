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
import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { SearchRequestModel, SearchResultsModel } from './search.model';
import { SearchService, SearchServiceBase } from './search.service';

@injectable()
export class SearchApigwService extends SearchServiceBase implements SearchService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    public async search(
        searchRequest: SearchRequestModel,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<SearchResultsModel> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        let queryString = req.toHttpQueryString();
        const queryString2 = QSHelper.getQueryString({ offset, count });
        if (queryString2 !== null) {
            queryString += queryString2;
        }

        ow(queryString, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.searchRelativeUrl()}?${queryString}`;

        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async delete(
        searchRequest: SearchRequestModel,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        const queryString = req.toHttpQueryString();

        ow(queryString, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.searchRelativeUrl()}?${queryString}`;

        await request
            .delete(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
