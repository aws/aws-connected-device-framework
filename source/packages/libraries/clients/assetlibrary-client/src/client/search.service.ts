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
import {ClientServiceBase} from './common.service';
import {SearchRequestModel, SearchResultsModel} from './search.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';

export interface SearchService {
    search(searchRequest:SearchRequestModel, offset?:number, count?:number, additionalHeaders?:RequestHeaders) : Promise<SearchResultsModel>;
}

@injectable()
export class SearchServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected searchRelativeUrl(): string {
        return '/search';
    }
}
