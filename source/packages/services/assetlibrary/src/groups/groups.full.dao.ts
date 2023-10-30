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
import { process } from 'gremlin';
import { inject, injectable } from 'inversify';
import { Claims } from '../authz/claims';
import { ConnectionDaoFull } from '../data/connection.full.dao';
import { CommonDaoFull } from '../data/common.full.dao';
import { FullAssembler } from '../data/full.assembler';
import { RelatedEntityDto, VertexDto, isRelatedEntityDto, isVertexDto } from '../data/full.model';
import {
    DirectionToRelatedEntityArrayMap,
    EntityTypeMap,
    ModelAttributeValue,
    RelatedEntityArrayMap,
    RelationDirection,
    SortKeys,
} from '../data/model';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { GroupsAssembler } from './groups.assembler';
import { GroupItem } from './groups.models';

const __ = process.statics;

/*  associate with any related groups  */
const associateRels = (
    traversal: process.GraphTraversal,
    rels: RelatedEntityArrayMap,
    direction: RelationDirection
) => {
    if (Object.keys(rels ?? {}).length > 0) {
        Object.entries(rels).forEach(([rel, entities]) => {
            entities.forEach((entity) => {
                const dbIdId = `group___${entity.id}`;
                if (direction === 'in') {
                    logger.info(`Adding relationship ${rel} from ${dbIdId} to group`);
                    traversal.V(dbIdId).addE(rel).to('group');
                } else {
                    logger.info(`Adding relationship ${rel} to ${dbIdId} from group`);
                    traversal.V(dbIdId).addE(rel).from_('group');
                }
                if (entity.isAuthCheck) {
                    traversal.property(process.cardinality.single, 'isAuthCheck', true);
                }
            });
        });
    }
};

const disassociateRels = (
    dropTraversals: process.GraphTraversal[],
    rels: RelatedEntityArrayMap,
    direction: RelationDirection
) => {
    console.debug('groups.full.dao disassociateRels:', JSON.stringify({ rels, direction }));
    if (Object.keys(rels ?? {}).length > 0) {
        Object.entries(rels).forEach(([rel, entities]) => {
            entities.forEach((entity) => {
                const target = `group___${entity.id}`;
                let t: process.GraphTraversal;
                if (direction === 'out') {
                    t = __.outE(rel).as('e');
                } else {
                    t = __.inE(rel).as('e');
                }
                t.otherV().has(process.t.id, target).select('e');
                dropTraversals.push(t);
            });
        });
    }
};

@injectable()
export class GroupsDaoFull {
    public constructor(
        @inject(TYPES.CommonDao) private commonDao: CommonDaoFull,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.ConnectionDao) private connectionDao: ConnectionDaoFull,
        @inject('authorization.enabled') private isAuthzEnabled: boolean
    ) {}

    public async get(groupPaths: string[], includeGroups: boolean): Promise<Node[]> {
        logger.debug(`groups.full.dao get: in: groupPath: ${groupPaths}`);

        const dbIds: string[] = groupPaths.map((g) => `group___${g}`);

        const relatedIn = __.inE();
        const relatedOut = __.outE();

        relatedIn
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
            .select('entityId', 'dir', 'e', 'vProps');

        relatedOut
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
            .select('entityId', 'dir', 'e', 'vProps');

        const groupProps = __.select('main').valueMap().with_(process.withOptions.tokens);

        /**
         * return the group, but when retrieving linked entities we need to retrieve
         * all groups excluding linked via 'parent' and ignore linked devices
         */
        const conn = await this.connectionDao.getConnection();
        const traverser = await conn.traversal
            .V(dbIds)
            .as('main')
            .values('groupPath')
            .as('entityId')
            .select('main');

        // TODO: verify and optimize this further
        !includeGroups
            ? traverser.union(groupProps)
            : traverser.union(relatedIn, relatedOut, groupProps);

        logger.debug(`groups.full.dao get: traverser: ${JSON.stringify(traverser.toString())}`);
        const results = await traverser.toList();
        logger.debug(`groups.full.dao get: result: ${JSON.stringify(results)}`);

        if (results === undefined || results.length === 0) {
            logger.debug(`groups.full.dao get: exit: node: undefined`);
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
        logger.debug(`groups.full.dao get: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async getLabels(groupPaths: string[]): Promise<EntityTypeMap> {
        logger.debug(`groups.full.dao getLabels: in: groupPaths: ${groupPaths}`);

        if ((groupPaths?.length ?? 0) === 0) {
            return {};
        }

        const dbIds = groupPaths.map((d) => `group___${d}`);
        const result = await this.commonDao.getLabels(dbIds);
        Object.entries(result).forEach(
            ([path, labels]) => (result[path] = labels.filter((l) => l !== 'group'))
        );
        logger.debug(`groups.full.dao getLabels: result: ${JSON.stringify(result)}`);
        return result;
    }

    public async create(n: Node, groups: DirectionToRelatedEntityArrayMap): Promise<string> {
        logger.debug(
            `groups.full.dao create: in: n:${JSON.stringify(n)}, groups:${JSON.stringify(groups)}`
        );

        const id = `group___${n.attributes['groupPath']}`;
        const labels = n.types.join('::');
        const parentId = `group___${n.attributes['parentPath']}`;

        const conn = await this.connectionDao.getConnection();
        const traversal = conn.traversal
            .V(parentId)
            .as('parent')
            .addV(labels)
            .property(process.t.id, id);

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key] !== undefined) {
                traversal.property(process.cardinality.single, key, n.attributes[key]);
            }
        }

        traversal.as('group').addE('parent').from_('group').to('parent');

        associateRels(traversal, groups?.in, 'in');
        associateRels(traversal, groups?.out, 'out');

        await traversal.next();

        logger.debug(`groups.full.dao create: exit: id:${id}`);
        return id;
    }

    public async update(n: Node, groups?: DirectionToRelatedEntityArrayMap): Promise<string> {
        logger.debug(`groups.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `group___${n.attributes['groupPath'].toString()}`;

        const conn = await this.connectionDao.getConnection();
        const traversal = conn.traversal.V(id).as('group');
        // drop() step terminates a traversal, process all drops as part of a final union step
        const dropTraversals: process.GraphTraversal[] = [];

        for (const [key, val] of Object.entries(n.attributes)) {
            if (val !== undefined) {
                if (val === null) {
                    dropTraversals.push(__.properties(key));
                } else {
                    traversal.property(process.cardinality.single, key, val);
                }
            }
        }

        // Check if related groups part of update request
        if (groups?.in || groups?.out) {
            // Update request contains relationships to enforce. This requires current
            // relationships be dropped where specified and new relations created.
            logger.info(
                `groups.full.dao update groups relations specified as part of update: ${JSON.stringify(
                    { groups: groups }
                )}`
            );
            const result = await this.get([`${n.attributes['groupPath']}`], true);
            let currentGroup: GroupItem;
            if (result !== undefined && result.length > 0) {
                currentGroup = this.groupsAssembler.toGroupItem(result[0]);
            }
            const existingGroups = currentGroup.groups ? currentGroup.groups : {};
            logger.debug(`Current group definition: ${JSON.stringify(currentGroup)}`);
            // Methodology
            // 1. Collect relations to be dropped as independent traversal objects via disassociateRels
            // 2. Union and then drop() these with traversal.sideEffect(...)
            //    -- Use of sideEffect acts on the traversal then passes results to next step. Without this, a drop() will terminate traversal.
            // 3. Add specified relations for groups and devices directly to traversal in associateRels
            const relationsToDropTraversals: process.GraphTraversal[] = [];
            if (groups.in && 'in' in existingGroups) {
                disassociateRels(relationsToDropTraversals, existingGroups.in, 'in');
            }
            if (groups.out && 'out' in existingGroups) {
                disassociateRels(relationsToDropTraversals, existingGroups.out, 'out');
            }
            traversal.sideEffect(__.union(...relationsToDropTraversals).drop());
            if (groups.in) {
                associateRels(traversal, groups.in, 'in');
            }
            if (groups.out) {
                associateRels(traversal, groups.out, 'out');
            }
        }

        if (dropTraversals.length > 0) {
            traversal.local(__.union(...dropTraversals)).drop();
        }

        await traversal.iterate();

        logger.debug(`groups.full.dao update: exit: id:${id}`);
        return id;
    }

    public async listRelated(
        groupPath: string,
        relationship: string,
        direction: string,
        template: string,
        filterRelatedBy: { [key: string]: ModelAttributeValue },
        offset: number,
        count: number,
        sort: SortKeys
    ): Promise<Node> {
        logger.debug(
            `groups.full.dao listRelated: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(
                filterRelatedBy
            )}, offset:${offset}, count:${count}, sort:${sort}`
        );

        const id = `group___${groupPath}`;

        let authorizedPaths: string[];
        if (this.isAuthzEnabled) {
            authorizedPaths = Claims.getInstance().listPaths();
        }

        return await this.commonDao.listRelated(
            id,
            relationship,
            direction,
            template,
            filterRelatedBy,
            offset,
            count,
            sort,
            authorizedPaths
        );
    }

    public async listParentGroups(groupPath: string): Promise<Node[]> {
        logger.debug(`groups.full.dao listParentGroups: in: groupPath:${groupPath}`);

        const id = 'group___' + groupPath;

        const conn = await this.connectionDao.getConnection();
        const results = await conn.traversal
            .V(id)
            .local(
                __.union(
                    __.identity().valueMap().with_(process.withOptions.tokens),
                    __.repeat(__.out('parent').simplePath().dedup())
                        .emit()
                        .valueMap()
                        .with_(process.withOptions.tokens)
                )
            )
            .toList();

        logger.debug(`groups.full.dao listParentGroups: results: ${JSON.stringify(results)}`);

        if (results === undefined || results.length === 0) {
            logger.debug(`groups.full.dao listParentGroups: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for (const result of results) {
            nodes.push(this.fullAssembler.assembleNode(result as VertexDto));
        }

        logger.debug(`groups.full.dao listParentGroups: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async delete(groupPath: string): Promise<void> {
        logger.debug(`groups.full.dao delete: in: groupPath:${groupPath}`);

        const dbId = `group___${groupPath}`;

        const conn = await this.connectionDao.getConnection();
        await conn.traversal.V(dbId).drop().next();

        logger.debug(`groups.full.dao delete: exit`);
    }

    public async attachToGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
        isAuthCheck: boolean
    ): Promise<void> {
        logger.debug(
            `groups.full.dao attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}, isAuthCheck:${isAuthCheck}`
        );

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const conn = await this.connectionDao.getConnection();
        const traverser = conn.traversal
            .V(targetId)
            .as('target')
            .V(sourceId)
            .as('source')
            .addE(relationship)
            .to('target');

        if (isAuthCheck) {
            traverser.property(process.cardinality.single, 'isAuthCheck', true);
        }

        const result = await traverser.iterate();

        logger.verbose(`groups.full.dao attachToGroup: result:${JSON.stringify(result)}`);

        logger.debug(`groups.full.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string
    ): Promise<void> {
        logger.debug(
            `groups.full.dao detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`
        );

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const conn = await this.connectionDao.getConnection();
        const result = await conn.traversal
            .V(sourceId)
            .as('source')
            .outE(relationship)
            .as('edge')
            .inV()
            .has(process.t.id, targetId)
            .as('target')
            .select('edge')
            .dedup()
            .drop()
            .iterate();

        logger.verbose(`groups.full.dao detachFromGroup: result:${JSON.stringify(result)}`);

        logger.debug(`groups.full.dao detachFromGroup: exit:`);
    }
}
