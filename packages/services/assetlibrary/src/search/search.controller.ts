/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Request, Response } from 'express';
import { interfaces, controller, httpGet, response, request, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import { SearchResultsResource } from '../search/search.models';
import { SearchAssembler } from '../search/search.assembler';
import { SearchService } from './search.service';
import {handleError} from '../utils/errors';

@controller('')
export class SearchController implements interfaces.Controller {

    constructor(
        @inject(TYPES.SearchAssembler) private searchAssembler:SearchAssembler,
        @inject(TYPES.SearchService) private searchService:SearchService) {}

    @httpGet('/search')
    public async search (
        @queryParam('type') types:string|string[], @queryParam('ancestorPath') ancestorPath:string,
        @queryParam('eq') eqs:string|string[], @queryParam('neq') neqs:string|string[],
        @queryParam('lt') lts:string|string[], @queryParam('lte') ltes:string|string[],
        @queryParam('gt') gts:string|string[], @queryParam('gte') gtes:string|string[],
        @queryParam('startsWith') startsWiths:string|string[],
        @queryParam('exist') exists:string|string[], @queryParam('nexist') nexists:string|string[],
        @queryParam('facetField') facetField:string,
        @queryParam('summarize') summarize:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @request() req:Request, @response() res: Response): Promise<SearchResultsResource> {

        logger.debug(`search.controller search: in: types:${types}, ancestorPath:${ancestorPath}, eqs:${eqs}, neqs:${neqs}, lts:${lts}, ltes:${ltes}, gts:${gts}, gtes:${gtes}, startsWiths:${startsWiths}, exists:${exists}, nexists:${nexists}, facetField:${facetField}, summarize:${summarize}, offset:${offset}, count:${count}`);

        const r: SearchResultsResource= {results:[]};

        const searchRequest = this.searchAssembler.toSearchRequestModel(types, ancestorPath, eqs, neqs, lts, ltes, gts, gtes, startsWiths, exists, nexists, facetField);

        try {
            if (summarize==='true') {
                const total = await this.searchService.summary(searchRequest);
                r.total=total;
            } else if (searchRequest.facetField!==undefined) {
                const facets = await this.searchService.facet(searchRequest);
                r.results = facets;
            } else {
                const [items,actualOffset,actualCount] = await this.searchService.search(searchRequest, offset, count);
                r.pagination = {
                    offset: actualOffset,
                    count: actualCount
                };
                if (items===undefined) {
                    r.results = [];
                } else {
                    r.results = this.searchAssembler.toSearchResultsResource(items, req['version']).results;
                }
            }
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`search.controller search: exit: ${JSON.stringify(r)}`);
        return r;
    }

}
