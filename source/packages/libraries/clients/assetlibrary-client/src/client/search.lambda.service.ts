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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {SearchRequestModel, SearchResultsModel} from './search.model';
import {RequestHeaders} from './common.model';
import {SearchService, SearchServiceBase} from './search.service';
import {
    DictionaryArray,
    LambdaApiGatewayEventBuilder,
    LAMBDAINVOKE_TYPES,
    LambdaInvokerService,
} from '@cdf/lambda-invoke';

@injectable()
export class SearchLambdaService extends SearchServiceBase implements SearchService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibrary.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    public async search(searchRequest:SearchRequestModel, offset?:number, count?:number, additionalHeaders?:RequestHeaders) : Promise<SearchResultsModel> {
        ow(searchRequest, ow.object.nonEmpty);

        const req = new SearchRequestModel();
        req.clone(searchRequest);

        let qs:DictionaryArray= {};
        if (offset) {
            qs.offset = [`${offset}`];
        }
        if (count) {
            qs.count = [`${count}`];
        }
        qs = {
            ...qs,
            ...req.toLambdaMultiValueQueryString()
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.searchRelativeUrl())
            .setMultiValueQueryStringParameters(qs)
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
