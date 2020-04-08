/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node} from '../data/node';
import { FullAssembler, NodeDto } from '../data/full.assembler';
import { ModelAttributeValue, DirectionStringToArrayMap } from '../data/model';
import { BaseDaoFull } from '../data/base.full.dao';
import { CommonDaoFull } from '../data/common.full.dao';

const __ = process.statics;

@injectable()
export class GroupsDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.CommonDao) private commonDao: CommonDaoFull,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async get(groupPath: string): Promise<Node> {
        logger.debug(`groups.full.dao get: in: groupPath: ${groupPath}`);

        const id = 'group___' + groupPath;

        /**
         * return the group, but when retrieving linked entities we need to retrieve
         * all groups excluding linked via 'parent' and ignore linked devices
         */
        let result;
        const conn = super.getConnection();
        try {
            result = await conn.traversal.V(id).as('object').
                project('object','EsIn','EsOut','VsIn','VsOut').
                    by(__.valueMap().with_(process.withOptions.tokens)).
                    by(__.inE().not(__.hasLabel('parent')).where(__.otherV().hasLabel('group')).valueMap().with_(process.withOptions.tokens).fold()).
                    by(__.outE().not(__.hasLabel('parent')).where(__.otherV().hasLabel('group')).valueMap().with_(process.withOptions.tokens).fold()).
                    by(__.inE().not(__.hasLabel('parent')).otherV().hasLabel('group').dedup().valueMap().with_(process.withOptions.tokens).fold()).
                    by(__.outE().not(__.hasLabel('parent')).otherV().hasLabel('group').dedup().valueMap().with_(process.withOptions.tokens).fold()).
                next();
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao get: query: ${JSON.stringify(result)}`);

        if (result.value===null) {
            logger.debug(`groups.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const value = result.value as process.Traverser;
        const r = JSON.parse(JSON.stringify(value)) as NodeDto;
        let node: Node;
        if (r) {
            node = this.fullAssembler.assembleNode(r.object);
            this.fullAssembler.assembleAssociations(node, r);
        }

        logger.debug(`groups.full.dao get: exit: node: ${JSON.stringify(node)}`);
        return node;

    }

    public async getLabels(groupPath: string): Promise<string[]> {
        logger.debug(`groups.full.dao getLabels: in: groupPath: ${groupPath}`);

        const id = 'group___' + groupPath;
        return await this.commonDao.getLabels(id);
    }

    public async create(n: Node, groups:DirectionStringToArrayMap): Promise<string> {
        logger.debug(`groups.full.dao create: in: n:${JSON.stringify(n)}, groups:${JSON.stringify(groups)}`);

        const id = `group___${n.attributes['groupPath']}`;
        const labels = n.types.join('::');
        const parentId = `group___${n.attributes['parentPath']}`;

        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.V(parentId).as('parent').
            addV(labels).
                property(process.t.id, id);

            for (const key of Object.keys(n.attributes)) {
                if (n.attributes[key]!==undefined) {
                    traversal.property(process.cardinality.single, key, n.attributes[key]);
                }
            }

            traversal.as('group')
                .addE('parent').from_('group').to('parent');

                /*  associate with the groups  */
                if (groups) {
                    if (groups.in) {
                        Object.keys(groups.in).forEach(rel=> {
                            groups.in[rel].forEach(v=> {
                                const groupId = `group___${v}`;
                                traversal.V(groupId).addE(rel).to('group');
                            });
                        });
                    }
                    if (groups.out) {
                        Object.keys(groups.out).forEach(rel=> {
                            groups.out[rel].forEach(v=> {
                                const groupId = `group___${v}`;
                                traversal.V(groupId).addE(rel).from_('group');
                            });
                        });
                    }
                }

            await traversal.next();
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao create: exit: id:${id}`);
        return id;

    }

    public async update(n: Node): Promise<string> {
        logger.debug(`groups.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `group___${n.attributes['groupPath'].toString()}`;

        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.V(id);

            for (const key of Object.keys(n.attributes)) {
                const val = n.attributes[key];
                if (val!==undefined) {
                    if (val===null) {
                        traversal.properties(key).drop();
                    } else {
                        traversal.property(process.cardinality.single, key, val);
                    }
                }
            }

            await traversal.next();
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao update: exit: id:${id}`);
        return id;

    }

    public async listRelated(groupPath: string, relationship: string, direction:string, template:string, filterRelatedBy:{[key:string]:ModelAttributeValue}, offset:number, count:number) : Promise<Node> {
        logger.debug(`groups.full.dao listRelated: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(filterRelatedBy)}, offset:${offset}, count:${count}`);

        const id = `group___${groupPath}`;
        return await this.commonDao.listRelated(id, relationship, direction, template, filterRelatedBy, offset, count);

    }

    public async listParentGroups(groupPath:string): Promise<Node[]> {
        logger.debug(`groups.full.dao listParentGroups: in: groupPath:${groupPath}`);

        const id = 'group___' + groupPath;

        let results;
        const conn = super.getConnection();
        try {
            results = await conn.traversal.V(id).
                local(
                    __.union(
                        __.identity().valueMap().with_(process.withOptions.tokens),
                        __.repeat(__.out('parent').simplePath().dedup()).
                            emit().
                            valueMap().with_(process.withOptions.tokens))).
                toList();
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao listParentGroups: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`groups.full.dao listParentGroups: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            nodes.push(this.fullAssembler.assembleNode(result));
        }

        logger.debug(`groups.full.dao listParentGroups: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;

    }

    public async delete(groupPath: string): Promise<void> {
        logger.debug(`groups.full.dao delete: in: groupPath:${groupPath}`);

        const dbId = `group___${groupPath}`;

        const conn = super.getConnection();
        try {
            await conn.traversal.V(dbId).drop().next();
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao delete: exit`);
    }

    public async attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.dao attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(targetId).as('target').
                V(sourceId).as('source').addE(relationship).to('target').
                iterate();

            logger.verbose(`groups.full.dao attachToGroup: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.dao detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(sourceId).as('source').
                outE(relationship).as('edge').
                inV().has(process.t.id, targetId).as('target').
                select('edge').dedup().drop().
                iterate();

            logger.verbose(`groups.full.dao detachFromGroup: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`groups.full.dao detachFromGroup: exit:`);
    }
}
