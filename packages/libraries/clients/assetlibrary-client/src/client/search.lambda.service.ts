/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

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
