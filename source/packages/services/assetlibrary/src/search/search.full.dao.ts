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
import { process, structure } from 'gremlin';
import { inject, injectable } from 'inversify';
import { NodeAssembler } from '../data/assembler';
import { BaseDaoFull, NeptuneConnection } from '../data/base.full.dao';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { ArgumentError } from '../utils/errors';
import { logger } from '@awssolutions/simple-cdf-logger';
import { TypeUtils } from '../utils/typeUtils';
import {
    FacetResults,
    SearchRequestFacet,
    SearchRequestFilter,
    SearchRequestFilterDirection,
    SearchRequestModel,
} from './search.models';

const __ = process.statics;

@injectable()
export class SearchDaoFull extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject('enableDfeOptimization') private enableDfeOptimization: boolean,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils,
        @inject(TYPES.NodeAssembler) private assembler: NodeAssembler,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph,
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    private buildSearchTraverser(
        conn: NeptuneConnection,
        request: SearchRequestModel,
        authorizedPaths: string[],
    ): process.GraphTraversal {
        logger.debug(
            `search.full.dao buildSearchTraverser: in: request: ${JSON.stringify(
                request,
            )}, authorizedPaths:${authorizedPaths}`,
        );

        let source: process.GraphTraversalSource = conn.traversal;
        if (this.enableDfeOptimization) {
            source = source.withSideEffect('Neptune#useDFE', true);
        }

        const ancestorId = `group___${request.ancestorPath}`;
        const traverser =
            request.ancestorPath && request.includeAncestor
                ? source
                      .V(ancestorId)
                      // Add the ancestor vertex to the emitted vertices
                      .union(__.repeat(__.in_().simplePath().dedup()).emit(), __.V(ancestorId))
                      .dedup()
                      .as('a')
                : request.ancestorPath
                ? source.V(ancestorId).repeat(__.in_().simplePath().dedup()).emit().as('a')
                : source.V().as('a');

        // construct Gremlin traverser from request parameters

        if (request.types !== undefined) {
            request.types.forEach((t) => traverser.select('a').hasLabel(t));
        }

        if (request.ntypes !== undefined) {
            request.ntypes.forEach((t) => traverser.select('a').not(__.hasLabel(t)));
        }

        if (request.eq! == undefined) {
            request.eq.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, f.value);
            });
        }
        if (request.neq !== undefined) {
            request.neq.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.not(__.has(f.field, f.value));
            });
        }
        if (request.lt !== undefined) {
            request.lt.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.lt(Number(f.value)));
            });
        }
        if (request.lte !== undefined) {
            request.lte.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.lte(Number(f.value)));
            });
        }
        if (request.gt !== undefined) {
            request.gt.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.gt(Number(f.value)));
            });
        }
        if (request.gte !== undefined) {
            request.gte.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.gte(Number(f.value)));
            });
        }
        if (request.startsWith !== undefined) {
            request.startsWith.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.TextP.startingWith(f.value));
            });
        }

        if (request.endsWith !== undefined) {
            request.endsWith.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.TextP.endingWith(f.value));
            });
        }

        if (request.contains !== undefined) {
            request.contains.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.TextP.containing(f.value));
            });
        }

        if (request.exists !== undefined) {
            request.exists.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterEBase(f, traverser);
                traverser.has(f.field, f.value);
            });
        }

        if (request.nexists !== undefined) {
            request.nexists.forEach((f) => {
                traverser.select('a');
                this.buildSearchFilterEBaseNegated(f, traverser, f.field, f.value);
            });
        }

        // if authz is enabled, only return results that the user is authorized to view
        if ((authorizedPaths?.length ?? 0) > 0) {
            // must reset all traversals so far as we need to use simplePath when FGAC is enabled to prevent cyclic checks
            traverser.select('a').dedup().fold().unfold().as('a');

            const authorizedPathIds = authorizedPaths.map((path) => `group___${path}`);
            traverser
                .local(
                    __.until(__.hasId(process.P.within(authorizedPathIds))).repeat(
                        __.outE().has('isAuthCheck', true).otherV().simplePath().dedup(),
                    ),
                )
                .as('authorization');
        }

        logger.debug(
            `search.full.dao buildSearchTraverser: traverser: ${JSON.stringify(
                traverser.toString(),
            )}`,
        );

        return traverser.select('a').dedup();
    }

    private buildSearchFilterVBase(
        filter: SearchRequestFilter | SearchRequestFacet,
        traverser: process.GraphTraversal,
    ): void {
        if (filter.traversals) {
            filter.traversals.forEach((t) => {
                if (t.direction === SearchRequestFilterDirection.in) {
                    traverser.in_(t.relation);
                } else {
                    traverser.out(t.relation);
                }
            });
        }
    }

    private buildSearchFilterEBase(
        filter: SearchRequestFilter | SearchRequestFacet,
        traverser: process.GraphTraversal,
    ): void {
        if (filter.traversals) {
            filter.traversals.forEach((t) => {
                if (t.direction === SearchRequestFilterDirection.in) {
                    traverser.inE(t.relation);
                } else {
                    traverser.outE(t.relation);
                }
                traverser.otherV();
            });
        }
    }

    private buildSearchFilterEBaseNegated(
        filter: SearchRequestFilter | SearchRequestFacet,
        traverser: process.GraphTraversal,
        field: unknown,
        value: unknown,
    ): void {
        if (filter.traversals) {
            const nested: process.GraphTraversal = __.select('a');
            filter.traversals.forEach((t) => {
                if (t.direction === SearchRequestFilterDirection.in) {
                    nested.inE(t.relation);
                } else {
                    nested.outE(t.relation);
                }
                nested.otherV();
            });
            nested.has(field, value);
            traverser.not(nested);
        }
    }

    public async search(request: SearchRequestModel, authorizedPaths: string[]): Promise<Node[]> {
        logger.debug(
            `search.full.dao search: in: request: ${JSON.stringify(
                request,
            )}, authorizedPaths:${authorizedPaths}`,
        );

        let results;
        const conn = super.getConnection();
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths);

            if (request.sort?.length > 0) {
                traverser.order();
                request.sort.forEach((s) => {
                    const order = s.direction === 'ASC' ? process.order.asc : process.order.desc;
                    traverser.by(__.coalesce(__.values(s.field), __.constant('')), order);
                });
            }

            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = this.typeUtils.parseInt(request.offset);
            const countAsInt = this.typeUtils.parseInt(request.count);
            if (typeof offsetAsInt !== 'number' || typeof countAsInt !== 'number') {
                throw new ArgumentError(
                    `Invalid offset or count, offset ${request.offset}, count ${request.count}`,
                );
            }
            traverser
                .range(offsetAsInt, offsetAsInt + countAsInt)
                .valueMap()
                .with_(process.withOptions.tokens);

            logger.debug(
                `search.full.dao search: traverser:${JSON.stringify(traverser.toString())}`,
            );

            results = await traverser.toList();
        } finally {
            await conn.close();
        }

        logger.debug(`search.full.dao search: results:${JSON.stringify(results)}`);

        if (results === undefined) {
            logger.debug(`search.full.dao search: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];

        for (const result of results) {
            let labels: string[];
            if (typeof result.label === 'string') {
                labels = (<string>result.label).split('::');
            } else {
                labels = <string[]>result.label;
            }
            nodes.push(this.assembler.toNode(result, labels));
        }

        logger.debug(`search.full.dao search: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async delete(request: SearchRequestModel, authorizedPaths: string[]): Promise<void> {
        logger.debug(
            `search.full.dao delete: in: request: ${JSON.stringify(
                request,
            )}, authorizedPaths:${authorizedPaths}`,
        );
        const conn = super.getConnection();
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths).union(
                __.hasLabel('group'),
                __.has('deviceId'),
            );
            logger.debug(`search.full.dao delete: in: traverser: ${traverser.toString()}`);
            await traverser.drop().iterate();
        } finally {
            await conn.close();
        }
    }

    public async facet(
        request: SearchRequestModel,
        authorizedPaths: string[],
    ): Promise<FacetResults> {
        logger.debug(
            `search.full.dao facet: in: request: ${JSON.stringify(
                request,
            )}, authorizedPaths:${authorizedPaths}`,
        );

        let results;
        const conn = super.getConnection();
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths);

            if (request.facetField !== undefined) {
                if (request.facetField.traversals !== undefined) {
                    request.facetField.traversals.forEach((t) => {
                        if (t.direction === SearchRequestFilterDirection.in) {
                            traverser.in_(t.relation);
                        } else {
                            traverser.out(t.relation);
                        }
                    });
                }
                traverser.values(request.facetField.field).groupCount();
            }
            logger.debug(
                `search.full.dao buildSearchTraverser: traverser: ${JSON.stringify(
                    traverser.toString(),
                )}`,
            );
            results = await traverser.next();
        } finally {
            await conn.close();
        }

        logger.debug(`search.full.dao facet: results: ${JSON.stringify(results)}`);

        if (results === undefined || results.value === undefined) {
            logger.debug(`search.full.dao facet: exit: node: undefined`);
            return undefined;
        }

        const facets: FacetResults = results.value as FacetResults;

        logger.debug(`search.full.dao facet: exit: nodes: ${JSON.stringify(facets)}`);
        return facets;
    }

    public async summary(request: SearchRequestModel, authorizedPaths: string[]): Promise<number> {
        logger.debug(
            `search.full.dao summarize: in: request: ${JSON.stringify(
                request,
            )}, authorizedPaths:${authorizedPaths}`,
        );

        const conn = super.getConnection();
        let result;
        try {
            const traverser = this.buildSearchTraverser(conn, request, authorizedPaths);
            result = await traverser.count().next();
        } finally {
            await conn.close();
        }

        const total = result.value as number;
        logger.debug(`search.full.dao summarize: exit: total: ${total}`);
        return total;
    }
}
