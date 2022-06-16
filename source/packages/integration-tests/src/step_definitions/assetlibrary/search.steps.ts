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
import 'reflect-metadata';
import { setDefaultTimeout, When, DataTable, Then} from '@cucumber/cucumber';
import {
    SearchService,
    SearchRequestModel,
    SearchResultsModel,
    Device20Resource,
    Group20Resource,
    SearchRequestFilter,
    ASSETLIBRARY_CLIENT_TYPES,
    SearchRequestFilterTraversal,
    SearchRequestFilterDirection,
} from '@cdf/assetlibrary-client';

import chai_string = require('chai-string');
import { expect, use} from 'chai';
import { RESPONSE_STATUS, AUTHORIZATION_TOKEN } from '../common/common.steps';
import {container} from '../../di/inversify.config';
import {Dictionary} from '@cdf/lambda-invoke';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

export const SEARCH_RESULTS = 'searchResults';

const searchService:SearchService = container.get(ASSETLIBRARY_CLIENT_TYPES.SearchService);
function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN],
        Accept: 'application/vnd.aws-cdf-v2.0+json',
        'Content-Type': 'application/vnd.aws-cdf-v2.0+json',
    };
}

function buildSearchRequest(data:DataTable):SearchRequestModel {
    const d = data.rowsHash();

    const searchRequest = new SearchRequestModel();

    Object.keys(d).forEach( param => {
        const queries:string[] = d[param].split(',');
        if (queries && queries.length>0) {
            queries.forEach(query=> {
                const attrs:string[] = query.split(':');

                if (param==='type') {
                    if (searchRequest.types===undefined) {
                        searchRequest.types=[];
                    }
                    searchRequest.types.push(attrs[0]);
                } else if (param==='ancestorPath') {
                    searchRequest['ancestorPath']=attrs[0];
                } else {
                    if (searchRequest[param]===undefined) {
                        searchRequest[param]=[];
                    }

                    const filter:SearchRequestFilter = {
                        field: attrs[attrs.length-2],
                        // test cases can optionally URL-encode the filter value, for example for lucene search operator  
                        // where the filter value contains ":" characters
                        value: decodeURIComponent(attrs[attrs.length-1]),
                    };
                    // do we have traversals defined?
                    if (attrs.length>2) {
                        const traversals:SearchRequestFilterTraversal[] = [];
                        for(let i=attrs.length-4; i>=0; i=-2) {
                            traversals.unshift({
                                relation: attrs[i],
                                direction: attrs[i+1] as SearchRequestFilterDirection
                            });
                        }
                        filter.traversals = traversals;
                    }

                    searchRequest[param].push(filter);
                }
            });
        }
    });
    return searchRequest;
}

When('I search with following attributes:', async function (data:DataTable) {
    const searchRequest = buildSearchRequest(data);

    try {
        delete this[SEARCH_RESULTS];
        delete this[RESPONSE_STATUS];

        this[SEARCH_RESULTS] = await searchService.search(searchRequest, undefined, undefined, getAdditionalHeaders(this));

    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I search with summary with following attributes:', async function (data:DataTable) {
    const searchRequest = buildSearchRequest(data);
    searchRequest.summarize=true;

    try {
        delete this[SEARCH_RESULTS];
        delete this[RESPONSE_STATUS];

        this[SEARCH_RESULTS] = await searchService.search(searchRequest, undefined, undefined, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('search result contains {int} results', function (total:number) {
    expect((<SearchResultsModel>this[SEARCH_RESULTS]).results.length).eq(total);
});

Then('search result contains device {string}', function (deviceId:string) {
    let found=false;
    (<SearchResultsModel>this[SEARCH_RESULTS]).results.forEach(item=> {
        if ( (<Device20Resource>item).deviceId===deviceId) {
            found=true;
        }
    });
    expect(found).eq(true);

});

Then('search result contains group {string}', function (groupPath:string) {
    let found=false;
    (<SearchResultsModel>this[SEARCH_RESULTS]).results.forEach(item=> {
        if ( (<Group20Resource>item).groupPath===groupPath) {
            found=true;
        }
    });
    expect(found).eq(true);

});

Then('search result contains {int} total', function (total:number) {
    const results = <SearchResultsModel>this[SEARCH_RESULTS];
    if (results.total) {
        expect(results.total).eq(total);
    } else {
        expect(results.results.length).eq(total);
    }
});
