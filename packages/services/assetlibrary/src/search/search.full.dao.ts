/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import {TYPES} from '../di/types';
import { SearchRequestModel, SearchRequestFilterDirection, SearchRequestFilter, SearchRequestFacet, FacetResults } from './search.models';
import {NodeAssembler} from '../data/assembler';
import {BaseDaoFull, NeptuneConnection} from '../data/base.full.dao';

const __ = process.statics;

@injectable()
export class SearchDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.NodeAssembler) private assembler:NodeAssembler,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    private buildSearchTraverser(conn: NeptuneConnection,request: SearchRequestModel, authorizedPaths:string[], offset?:number, count?:number) : process.GraphTraversal {

        logger.debug(`search.full.dao buildSearchTraverser: in: request: ${JSON.stringify(request)}, authorizedPaths:${authorizedPaths}, offset:${offset}, count:${count}`);

        const filters: process.GraphTraversal[]= [];

        let traverser: process.GraphTraversal;
        traverser = conn.traversal.V().as('a');

        // construct all the filters that we will eventually pass to match()
        if (request.ancestorPath!==undefined) {
            const ancestorId = `group___${request.ancestorPath}`;
            filters.push(
                __.as('a').until(__.hasId(ancestorId)).repeat(__.out('parent'))
            );
        }

        if (request.types!==undefined) {
            request.types.forEach(t=> filters.push(
                __.as('a').hasLabel(t)) );
        }

        if (request.eq!==undefined) {
            request.eq.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.has(f.field, f.value));
            });
        }
        if (request.neq!==undefined) {
            request.neq.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.not(__.has(f.field, f.value)));
            });
        }
        if (request.lt!==undefined) {
            request.lt.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.values(f.field).is(process.P.lt(Number(f.value))));
            });
        }
        if (request.lte!==undefined) {
            request.lte.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.values(f.field).is(process.P.lte(Number(f.value))));
            });
        }
        if (request.gt!==undefined) {
            request.gt.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.values(f.field).is(process.P.gt(Number(f.value))));
            });
        }
        if (request.gte!==undefined) {
            request.gte.forEach(f=> {
                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.values(f.field).is(process.P.gte(Number(f.value))));
            });
        }
        if (request.startsWith!==undefined) {
            request.startsWith.forEach(f=> {
                const startValue = <string> f.value;
                const nextCharCode = String.fromCharCode( startValue.charCodeAt(startValue.length-1) + 1);
                const endValue = this.setCharAt(startValue, startValue.length-1, nextCharCode);

                const filter = this.buildSearchFilterBase(f);
                filters.push(filter.has(f.field, process.P.between(startValue, endValue)));
            });
        }

        if (request.endsWith!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }
        if (request.contains!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }

        if (authorizedPaths!==undefined && authorizedPaths.length>0) {
            filters.push(
                __.local(__.until(__.has('groupPath', process.P.within(authorizedPaths))).repeat(__.out()))
            );
        }

        // apply the match criteria
        if (filters.length>0) {
            traverser.match(...filters).dedup();
        }

        // if authz is enabled, only return results that the user is authorized to view

        // logger.debug(`search.full.dao buildSearchTraverser: traverser: ${JSON.stringify(traverser.toString())}`);

        return traverser.select('a').dedup();

    }

    private buildSearchFilterBase(filter:SearchRequestFilter|SearchRequestFacet) : process.GraphTraversal {
        const response:process.GraphTraversal = __.as('a');
        if (filter.traversals) {
            filter.traversals.forEach(t=> {
                if (t.direction===SearchRequestFilterDirection.in) {
                    response.in_(t.relation);
                } else {
                    response.out(t.relation);
                }
            });
        }
        return response;
    }

    public async search(request: SearchRequestModel, authorizedPaths:string[], offset:number, count:number): Promise<Node[]> {
        logger.debug(`search.full.dao search: in: request: ${JSON.stringify(request)}, authorizedPaths:${authorizedPaths}, offset:${offset}, count:${count}`);

        let results;
        const conn = super.getConnection();
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths, offset, count);

            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);

            traverser.
                select('a').range(offsetAsInt,offsetAsInt + countAsInt).valueMap().with_(process.withOptions.tokens);

            // logger.debug(`search.full.dao search: traverser:${JSON.stringify(traverser.toString())}`);

            results = await traverser.toList();

        } finally {
            conn.close();
        }

        logger.debug(`search.full.dao search: results:${JSON.stringify(results)}`);

        if (results===undefined ) {
            logger.debug(`search.full.dao search: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];

        for(const result of results) {
            let labels:string[];
            if(typeof result.label === 'string') {
                labels = (<string> result.label).split('::');
            } else {
                labels = <string[]> result.label;
            }
            nodes.push(this.assembler.toNode(result, labels));
        }

        logger.debug(`search.full.dao search: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async facet(request: SearchRequestModel, authorizedPaths:string[]): Promise<FacetResults> {
        logger.debug(`search.full.dao facet: in: request: ${JSON.stringify(request)}, authorizedPaths:${authorizedPaths}`);

        let results;
        const conn = super.getConnection();
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths);

            if (request.facetField!==undefined) {
                traverser.select('a');
                if (request.facetField.traversals!==undefined) {
                    request.facetField.traversals.forEach(t=> {
                        if (t.direction===SearchRequestFilterDirection.in) {
                            traverser.in_(t.relation);
                        } else {
                            traverser.out(t.relation);
                        }
                    });
                }
                traverser.values(request.facetField.field).groupCount();
            }
            logger.debug(`search.full.dao buildSearchTraverser: traverser: ${JSON.stringify(traverser.toString())}`);
            results = await traverser.next();
        } finally {
            conn.close();
        }

        logger.debug(`search.full.dao facet: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.value===undefined) {
            logger.debug(`search.full.dao facet: exit: node: undefined`);
            return undefined;
        }

        const facets:FacetResults = results.value as FacetResults;

        logger.debug(`search.full.dao facet: exit: nodes: ${JSON.stringify(facets)}`);
        return facets;
    }

    public async summary(request: SearchRequestModel, authorizedPaths:string[]): Promise<number> {
        logger.debug(`search.full.dao summarize: in: request: ${JSON.stringify(request)}, authorizedPaths:${authorizedPaths}`);

        const conn = super.getConnection();
        let result;
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths);
            result = await traverser.select('a').count().next();
        } finally {
            conn.close();
        }

        const total = result.value as number;
        logger.debug(`search.full.dao summarize: exit: total: ${total}`);
        return total;
    }

    private setCharAt(text:string, index:number, replace:string):string {
        return text.substring(0, index) + replace + text.substring(index+1);
    }

}
