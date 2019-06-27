/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Before, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import { SearchService, SearchRequestModel, SearchResultsModel, Device, Group, SearchRequestFilter } from '@cdf/assetlibrary-client/dist';

import chai_string = require('chai-string');
import { expect, use} from 'chai';
import { RESPONSE_STATUS } from '../common/common.steps';

use(chai_string);

setDefaultTimeout(10 * 1000);

export const SEARCH_RESULTS = 'searchResults';

let search: SearchService;

Before(function () {
    search = new SearchService();
});

function buildSearchRequest(data:TableDefinition):SearchRequestModel {
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
                        value: attrs[attrs.length-1]
                    };
                    // do we have traversals defined?
                    if (attrs.length>2) {
                        // TODO: process traversals
                    }

                    searchRequest[param].push(filter);
                }
            });
        }
    });
    return searchRequest;
}

When('I search with following attributes:', async function (data:TableDefinition) {
    const searchRequest = buildSearchRequest(data);

    try {
        delete this[SEARCH_RESULTS];
        delete this[RESPONSE_STATUS];

        this[SEARCH_RESULTS] = await search.search(searchRequest);

    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I search with summary with following attributes:', async function (data:TableDefinition) {
    const searchRequest = buildSearchRequest(data);
    searchRequest.summarize=true;

    try {
        delete this[SEARCH_RESULTS];
        delete this[RESPONSE_STATUS];

        this[SEARCH_RESULTS] = await search.search(searchRequest);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('search result contains {int} results', function (total:number) {
    expect((<SearchResultsModel>this[SEARCH_RESULTS]).results.length).eq(total);
});

Then('search result contains device {string}', function (deviceId:string) {
    let found:boolean=false;
    (<SearchResultsModel>this[SEARCH_RESULTS]).results.forEach(item=> {
        if ( (<Device>item).deviceId===deviceId) {
            found=true;
        }
    });
    expect(found).eq(true);

});

Then('search result contains group {string}', function (groupPath:string) {
    let found:boolean=false;
    (<SearchResultsModel>this[SEARCH_RESULTS]).results.forEach(item=> {
        if ( (<Group>item).groupPath===groupPath) {
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
