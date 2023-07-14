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
import {
    DictionaryArray,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { SearchRequestModel, SearchResultsModel } from './search.model';
import { SearchService, SearchServiceBase } from './search.service';

@injectable()
export class SearchLambdaService extends SearchServiceBase implements SearchService {
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARY_API_FUNCTION_NAME;
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

        let qs: DictionaryArray = {};
        if (offset) {
            qs.offset = [`${offset}`];
        }
        if (count) {
            qs.count = [`${count}`];
        }
        qs = {
            ...qs,
            ...req.toLambdaMultiValueQueryString(),
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.searchRelativeUrl())
            .setMultiValueQueryStringParameters(qs)
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async delete(
        searchRequest: SearchRequestModel,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        const qs = req.toLambdaMultiValueQueryString();

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.searchRelativeUrl())
            .setMultiValueQueryStringParameters(qs)
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
