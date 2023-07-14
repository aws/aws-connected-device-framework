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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    interfaces,
    queryParam,
    request,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { SearchAssembler } from '../search/search.assembler';
import { SearchResultsResource } from '../search/search.models';
import { handleError } from '../utils/errors';
import { SearchService } from './search.service';

@controller('')
export class SearchController implements interfaces.Controller {
    constructor(
        @inject(TYPES.SearchAssembler) private searchAssembler: SearchAssembler,
        @inject(TYPES.SearchService) private searchService: SearchService,
    ) {}

    @httpGet('/search')
    public async search(
        @queryParam('type') types: string | string[],
        @queryParam('ntype') ntypes: string | string[],
        @queryParam('ancestorPath') ancestorPath: string,
        @queryParam('includeAncestor') includeAncestor: boolean,
        @queryParam('eq') eqs: string | string[],
        @queryParam('neq') neqs: string | string[],
        @queryParam('lt') lts: string | string[],
        @queryParam('lte') ltes: string | string[],
        @queryParam('gt') gts: string | string[],
        @queryParam('gte') gtes: string | string[],
        @queryParam('startsWith') startsWiths: string | string[],
        @queryParam('endsWith') endsWiths: string | string[],
        @queryParam('contains') containses: string | string[],
        @queryParam('exist') exists: string | string[],
        @queryParam('nexist') nexists: string | string[],
        @queryParam('facetField') facetField: string,
        @queryParam('summarize') summarize: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<SearchResultsResource> {
        logger.debug(
            `search.controller search: in: types:${types}, ancestorPath:${ancestorPath}, eqs:${eqs}, neqs:${neqs}, lts:${lts}, ltes:${ltes}, gts:${gts}, gtes:${gtes}, startsWiths:${startsWiths}, endsWiths:${endsWiths}, containses:${containses}, exists:${exists}, nexists:${nexists}, facetField:${facetField}, summarize:${summarize}, offset:${offset}, count:${count}, sort:${sort}`,
        );

        const r: SearchResultsResource = { results: [] };

        try {
            const searchRequest = this.searchAssembler.toSearchRequestModel(
                types,
                ntypes,
                ancestorPath,
                includeAncestor,
                eqs,
                neqs,
                lts,
                ltes,
                gts,
                gtes,
                startsWiths,
                endsWiths,
                containses,
                exists,
                nexists,
                facetField,
                offset,
                count,
                sort,
            );

            if (summarize === 'true') {
                const total = await this.searchService.summary(searchRequest);
                r.total = total;
            } else if (searchRequest.facetField !== undefined) {
                const facets = await this.searchService.facet(searchRequest);
                r.results = facets;
            } else {
                const [items, actualOffset, actualCount] = await this.searchService.search(
                    searchRequest,
                );
                r.pagination = {
                    offset: actualOffset,
                    count: actualCount,
                };
                if (items === undefined) {
                    r.results = [];
                } else {
                    r.results = this.searchAssembler.toSearchResultsResource(
                        items,
                        req['version'],
                    ).results;
                }
            }
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`search.controller search: exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpDelete('/search')
    public async delete(
        @queryParam('type') types: string | string[],
        @queryParam('ntype') ntypes: string | string[],
        @queryParam('ancestorPath') ancestorPath: string,
        @queryParam('includeAncestor') includeAncestor: boolean,
        @queryParam('eq') eqs: string | string[],
        @queryParam('neq') neqs: string | string[],
        @queryParam('lt') lts: string | string[],
        @queryParam('lte') ltes: string | string[],
        @queryParam('gt') gts: string | string[],
        @queryParam('gte') gtes: string | string[],
        @queryParam('startsWith') startsWiths: string | string[],
        @queryParam('endsWith') endsWiths: string | string[],
        @queryParam('contains') containses: string | string[],
        @queryParam('exist') exists: string | string[],
        @queryParam('nexist') nexists: string | string[],
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `search.controller delete: in: types:${types}, ancestorPath:${ancestorPath}, eqs:${eqs}, neqs:${neqs}, lts:${lts}, ltes:${ltes}, gts:${gts}, gtes:${gtes}, startsWiths:${startsWiths}, endsWiths:${endsWiths}, containses:${containses}, exists:${exists}, nexists:${nexists}`,
        );

        const searchRequest = this.searchAssembler.toSearchRequestModel(
            types,
            ntypes,
            ancestorPath,
            includeAncestor,
            eqs,
            neqs,
            lts,
            ltes,
            gts,
            gtes,
            startsWiths,
            endsWiths,
            containses,
            exists,
            nexists,
        );

        try {
            await this.searchService.delete(searchRequest);
        } catch (e) {
            handleError(e, res);
        }
    }
}
