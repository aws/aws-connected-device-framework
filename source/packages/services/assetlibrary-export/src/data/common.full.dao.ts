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
import { process, structure } from 'gremlin';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { TypeUtils } from '../utils/typeUtils';
import { BaseDaoFull } from './base.full.dao';
import { FullAssembler } from './full.assembler';
import { RelatedEntityDto, VertexDto, isRelatedEntityDto, isVertexDto } from './full.model';
import { ModelAttributeValue, SortKeys } from './model';
import { Node } from './node';

const __ = process.statics;

@injectable()
export class CommonDaoFull extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listRelated(
        entityDbId: string,
        relationship: string,
        direction: string,
        template: string,
        filterRelatedBy: { [key: string]: ModelAttributeValue },
        offset: number,
        count: number,
        sort: SortKeys
    ): Promise<Node> {
        logger.debug(
            `common.full.dao listRelated: in: entityDbId:${entityDbId}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(
                filterRelatedBy
            )}, offset:${offset}, count:${count}, ${JSON.stringify(sort)}`
        );

        // define the traversers that handle finding associated edges/vertices
        const relatedIn = __.inE();
        const relatedOut = __.outE();

        // filter the edges based on the relationship type (if requiested)
        if (relationship === '*') {
            relationship = undefined;
        }
        if (relationship) {
            [relatedIn, relatedOut].forEach((t) => t.hasLabel(relationship).as('e'));
        }

        // navigate to the linked vertex for each relation, filtering the type
        [relatedIn, relatedOut].forEach((t) => t.as('e').otherV().hasLabel(template).as('v'));

        // apply filtering to the linked vertex (if required)
        if (filterRelatedBy !== undefined) {
            Object.keys(filterRelatedBy).forEach((k) => {
                [relatedIn, relatedOut].forEach((t) => t.has(k, filterRelatedBy[k]));
            });
        }

        // return the info we need to understand about each relation
        [relatedIn, relatedOut].forEach((t) =>
            t.valueMap().with_(process.withOptions.tokens).as('vProps')
        );
        relatedIn.constant('in').as('dir');
        relatedOut.constant('out').as('dir');
        [relatedIn, relatedOut].forEach((t) => t.select('dir', 'e', 'vProps'));

        // build the union traversal that combines the incoming and outgoing relations (depending on what was requested)
        let relatedUnion: process.GraphTraversal;
        if (direction === 'in') {
            relatedUnion = relatedIn;
        } else if (direction === 'out') {
            relatedUnion = relatedOut;
        } else {
            relatedUnion = __.union(relatedIn, relatedOut);
        }

        // apply sorting to the related (if requested)
        if (sort?.length > 0) {
            relatedUnion.order();
            sort.forEach((s) => {
                const order = s.direction === 'ASC' ? process.order.asc : process.order.desc;
                // sort using an attribute from the connected vertices, with a failsafe incase the attribute is undefined
                relatedUnion.by(
                    __.coalesce(__.select('v').values(s.field), __.constant('')),
                    order
                );
            });
        }

        // apply pagination to the related (if requested)
        if (offset !== undefined && count !== undefined) {
            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = this.typeUtils.parseInt(offset);
            const countAsInt = this.typeUtils.parseInt(count);
            relatedUnion.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        // build the main part of the query, unioning the related traversers with the main entity we want to return
        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(entityDbId)
                .as('main')
                .union(
                    relatedUnion,
                    __.select('main').valueMap().with_(process.withOptions.tokens)
                );

            // execute and retrieve the results
            logger.debug(
                `common.full.dao listRelated: traverser: ${JSON.stringify(traverser.toString())}`
            );
            results = await traverser.toList();
            logger.debug(`common.full.dao listRelated: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results === undefined || results.length === 0) {
            logger.debug(`common.full.dao listRelated: exit: node: undefined`);
            return undefined;
        }

        // the result should contain a vertex representing the entity requested as 1 row, then all requested relations as other rows
        // find the main entity first
        const mainEntity = results.filter((r) => isVertexDto(r))[0] as VertexDto;
        const node = this.fullAssembler.assembleNode(mainEntity);

        const relatedEntities = results
            .filter((r) => isRelatedEntityDto(r))
            .map((r) => r as unknown as RelatedEntityDto);
        relatedEntities.forEach((r) => this.fullAssembler.assembleAssociation(node, r));

        logger.debug(`common.full.dao listRelated: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public async getLabels(entityDbId: string): Promise<string[]> {
        logger.debug(`common.full.dao getLabels: in: entityDbId: ${entityDbId}`);

        let labelResults;
        const conn = super.getConnection();
        try {
            labelResults = await conn.traversal.V(entityDbId).label().toList();
        } finally {
            await conn.close();
        }

        if (labelResults === undefined || labelResults.length === 0) {
            logger.debug('common.full.dao getLabels: exit: labels:undefined');
            return undefined;
        } else {
            const labels: string[] = JSON.parse(JSON.stringify(labelResults)) as string[];
            if (labels.length === 1) {
                // all devices/groups should have 2 labels
                // if only 1 is returned it is an older version of the Neptune engine
                // which returns labels as a concatinated string (label1::label2)
                // attempt to be compatable with this
                const splitLabels: string[] = labels[0].split('::');
                if (splitLabels.length < 2) {
                    logger.error(
                        `common.full.dao getLabels: entityDbId ${entityDbId} does not have correct labels`
                    );
                    throw new Error('INVALID_LABELS');
                }
                logger.debug(`common.full.dao getLabels: exit: labels: ${labels}`);
                return labels;
            } else {
                logger.debug(`common.full.dao getLabels: exit: labels: ${labels}`);
                return labels;
            }
        }
    }
}
