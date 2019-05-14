/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import {TYPES} from '../di/types';
import { SearchRequestModel } from './search.models';
import {NodeAssembler} from '../data/assembler';

const __ = process.statics;

@injectable()
export class SearchDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
        @inject(TYPES.NodeAssembler) private assembler:NodeAssembler,
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    private buildSearchTraverser(request: SearchRequestModel, offset:number, count:number) : process.GraphTraversal {

        logger.debug(`search.full.dao buildSearchTraverser: in: request: ${JSON.stringify(request)}, offset:${offset}, count:${count}`);

        const filters: process.GraphTraversal[]= [];

        // if a path is provided, that becomes the starting point
        let traverser: process.GraphTraversal;
        if (request.ancestorPath!==undefined) {
            const ancestorId = `group___${request.ancestorPath}`;
            traverser = this._g.V(ancestorId).
                repeat(__.in_()).emit().as('a');
        } else {
            traverser = this._g.V().as('a');
        }

        // construct all the filters that we will eventually pass to match()
        if (request.types!==undefined) {
            request.types.forEach(t=> filters.push(
                __.as('a').hasLabel(t)) );
        }
        if (request.eq!==undefined) {
            Object.keys(request.eq).forEach( key => {
                filters.push(__.as('a').has(key, request.eq[key])) ;
            });
        }
        if (request.neq!==undefined) {
            Object.keys(request.neq).forEach( key => {
                filters.push(__.as('a').not(__.has(key, request.neq[key]))) ;
            });
        }
        if (request.lt!==undefined) {
            Object.keys(request.lt).forEach( key => filters.push(
                __.as('a').values(key).is(process.P.lt(request.lt[key]))) );
        }
        if (request.lte!==undefined) {
            Object.keys(request.lte).forEach( key => filters.push(
                __.as('a').values(key).is(process.P.lte(request.lte[key]))) );
        }
        if (request.gt!==undefined) {
            Object.keys(request.gt).forEach( key => filters.push(
                __.as('a').values(key).is(process.P.gt(request.gt[key]))) );
        }
        if (request.gte!==undefined) {
            Object.keys(request.gte).forEach( key => filters.push(
                __.as('a').values(key).is(process.P.gte(request.gte[key]))) );
        }
        if (request.startsWith!==undefined) {
            Object.keys(request.startsWith).forEach( key => {
                const startValue = request.startsWith[key];
                const nextCharCode = String.fromCharCode( startValue.charCodeAt(startValue.length-1) + 1);
                const endValue = this.setCharAt(startValue, startValue.length-1, nextCharCode);

                filters.push(
                    __.as('a').has(key, process.P.between(startValue, endValue)) );
                });
        }
        if (request.endsWith!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }
        if (request.contains!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }

        // apply the match criteria
        if (filters.length>0) {
            traverser.match(...filters);
        }

        // apply pagination
        if (offset!==undefined && count!==undefined) {
            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // througout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);
            traverser.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        logger.debug(`search.full.dao buildSearchTraverser: traverser: ${JSON.stringify(traverser.toString())}`);

        return traverser;
    }

    public async search(request: SearchRequestModel, offset:number, count:number): Promise<Node[]> {
        logger.debug(`search.full.dao search: in: request: ${JSON.stringify(request)}, offset:${offset}, count:${count}`);

        const traverser = this.buildSearchTraverser(request, offset, count);

        const results = await traverser.select('a').valueMap(true).toList();

        if (results.length===0) {
            logger.debug(`search.full.dao search: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            const labels = (<string> result.label).split('::');
            nodes.push(this.assembler.toNode(result, labels));
        }

        logger.debug(`search.full.dao search: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async summary(request: SearchRequestModel): Promise<number> {
        logger.debug(`search.full.dao summarize: in: request: ${JSON.stringify(request)}`);

        const traverser = this.buildSearchTraverser(request, undefined, undefined);

        const result = await traverser.select('a').count().next();
        const total = result.value as number;
        logger.debug(`search.full.dao summarize: exit: total: ${total}`);
        return total;
    }

    private setCharAt(text:string, index:number, replace:string):string {
        return text.substring(0, index) + replace + text.substring(index+1);
    }

}
