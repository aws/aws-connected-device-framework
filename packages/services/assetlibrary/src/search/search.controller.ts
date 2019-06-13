/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, httpGet, response, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import { SearchResultsModel } from '../search/search.models';
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
        @queryParam('facetField') facetField:string,
        @queryParam('summarize') summarize:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @response() res: Response): Promise<SearchResultsModel> {

        logger.debug(`search.controller search: in: types:${types}, ancestorPath:${ancestorPath}, eqs:${eqs}, neqs:${neqs}, lts:${lts}, ltes:${ltes}, gts:${gts}, gtes:${gtes}, startsWiths:${startsWiths}, facetField:${facetField}, summarize:${summarize}, offset:${offset}, count:${count}`);

          const r: SearchResultsModel= {results:[]};

          if (offset && count) {
              r.pagination = {
                  offset,
                  count
              };
          }

        const req = this.searchAssembler.toSearchRequestModel(types, ancestorPath, eqs, neqs, lts, ltes, gts, gtes, startsWiths, facetField);

        try {
            if (summarize==='true') {
                const total = await this.searchService.summary(req);
                r.total=total;
            } else if (req.facetField!==undefined) {
                const facets = await this.searchService.facet(req);
                r.results = facets;
            } else {
                const results = await this.searchService.search(req, offset, count);
                if (results===undefined) {
                    r.results = [];
                } else {
                    r.results = results;
                }
            }
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`search.controller search: exit: ${JSON.stringify(r)}`);
        return r;
    }

}
