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

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';

import { BaseDaoFull } from '../data/base.full.dao';
import { FullAssembler } from '../data/full.assembler';
import { RelatedEntityDto, VertexDto, isRelatedEntityDto, isVertexDto } from '../data/full.model';
import { Node } from '../data/node';

const __ = process.statics;

@injectable()
export class GroupsDao extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph,
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async get(groupPaths: string[]): Promise<Node[]> {
        logger.silly(`groups.full.dao get: in: groupPath: ${groupPaths}`);

        const dbIds: string[] = groupPaths.map((g) => `group___${g}`);

        /**
         * return the group, but when retrieving linked entities we need to retrieve
         * all groups excluding linked via 'parent' and ignore linked devices
         */
        let results: process.Traverser[];
        const conn = super.getConnection();
        try {
            const traverser = await conn.traversal
                .V(dbIds)
                .as('main')
                .values('groupPath')
                .as('entityId')
                .select('main')
                .union(
                    __.inE()
                        .as('e')
                        .not(__.hasLabel('parent'))
                        .otherV()
                        .hasLabel('group')
                        .as('v')
                        .valueMap()
                        .with_(process.withOptions.tokens)
                        .as('vProps')
                        .constant('in')
                        .as('dir')
                        .select('entityId', 'dir', 'e', 'vProps'),
                    __.outE()
                        .as('e')
                        .not(__.hasLabel('parent'))
                        .otherV()
                        .hasLabel('group')
                        .as('v')
                        .valueMap()
                        .with_(process.withOptions.tokens)
                        .as('vProps')
                        .constant('out')
                        .as('dir')
                        .select('entityId', 'dir', 'e', 'vProps'),
                    __.select('main').valueMap().with_(process.withOptions.tokens),
                );

            logger.silly(
                `groups.full.dao get: traverser: ${JSON.stringify(traverser.toString())}`,
            );
            results = await traverser.toList();
            logger.silly(`groups.full.dao get: result: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results === undefined || results.length === 0) {
            logger.silly(`groups.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        const groups = results.filter((r) => isVertexDto(r)) as VertexDto[];
        groups.forEach((g) => {
            // construct the node
            const node = this.fullAssembler.assembleNode(g);
            // find any relations for the groups
            const relatedEntities = results
                .filter((r) => isRelatedEntityDto(r) && r.entityId === g['groupPath'][0])
                .map((r) => r as unknown as RelatedEntityDto);

            relatedEntities.forEach((r) => this.fullAssembler.assembleAssociation(node, r));
            nodes.push(node);
        });

        logger.silly(`groups.full.dao get: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;
    }
}
