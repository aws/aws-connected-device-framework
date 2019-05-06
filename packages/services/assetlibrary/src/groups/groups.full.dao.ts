/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node, AttributeValue} from '../data/node';
import {NodeAssembler} from '../data/assembler';
import { TypeCategory } from '../types/constants';

const __ = process.statics;

@injectable()
export class GroupsDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
        @inject(TYPES.NodeAssembler) private assembler: NodeAssembler,
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async get(groupPath: string): Promise<Node> {
        logger.debug(`groups.full.dao get: in: groupPath: ${groupPath}`);

        const id = 'group___' + groupPath;

        /**
         * return the group, but when retrieving linked entities we need to retrieve
         * all groups exluding linked via 'parent' and ignore linked devices
         */
        const result = await this._g.V(id).as('group').
            project('group','paths','Es','Vs').
                by(__.valueMap(true)).
                by(__.bothE().not(__.hasLabel('parent')).otherV().hasLabel('group').path().by(process.t.id).fold()).
                by(__.bothE().not(__.hasLabel('parent')).where(__.otherV().hasLabel('group')).valueMap(true).fold()).
                by(__.bothE().not(__.hasLabel('parent')).otherV().hasLabel('group').dedup().valueMap(true).fold()).
            next();

        logger.debug(`groups.full.dao get: query: ${JSON.stringify(result)}`);

        if (result.value===null) {
            logger.debug(`groups.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const value = result.value as process.Traverser;
        const r = JSON.parse(JSON.stringify(value)) as GetGroupResult;
        let node: Node;
        if (r) {
            node = this.assembleNode(r.group);
            this.assembleAssociations(node, r);
        }

        logger.debug(`groups.full.dao get: exit: node: ${JSON.stringify(node)}`);
        return node;

    }

    private assembleNode(group:{ [key:string]: AttributeValue}):Node {
        logger.debug(`groups.full.dao assembleNode: in: group: ${JSON.stringify(group)}`);

        const labels = (<string> group['label']).split('::');
        const node = new Node();
        Object.keys(group).forEach( key => {
            if (key==='id') {
                node.id = <string> group[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = group[key] ;
            }
        });

        logger.debug(`groups.full.dao assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    private assembleAssociations(node:Node, r:GetGroupResult) {
        logger.debug(`groups.full.dao assembleAssociations: in: node:${JSON.stringify(node)}, r:${JSON.stringify(r)}`);

        // assemble all associated objects
        r.paths.forEach((value)=> {
            const eId = value.objects[1];
            const direction = (value.objects[0]===r.group.id) ? 'out' : 'in';
            const vId = (direction==='out') ? value.objects[2] : value.objects[0];
            const e = (r.Es!==undefined && r.Es!==null) ? r.Es.filter(edge=> edge.id===eId) : [];
            const v = (r.Vs!==undefined && r.Vs!==null) ? r.Vs.filter(vertex=> vertex.id===vId): [];

            if (v[0]!==undefined) {
                const l = (<string> v[0]['label']).split('::');
                if (l.includes(TypeCategory.Group)) {
                    const other = new Node();
                    other.attributes['groupPath'] = v[0]['groupPath']as string;
                    other.category = TypeCategory.Group;
                    node.addLink(direction, e[0]['label'], other);
                } else {
                    logger.warn(`assembleAssociations does not yet support handling ${l}`);
                }
            }
        });

        logger.debug(`groups.full.dao assembleAssociations: exit: node: ${JSON.stringify(node)}`);
    }

    public async getLabels(groupPath: string): Promise<string[]> {
        logger.debug(`groups.full.dao getLabels: in: groupPath: ${groupPath}`);

        const id = 'group___' + groupPath;

        const labelResults = await this._g.V(id).label().toList();

        if (labelResults===undefined || labelResults.length===0) {
            logger.debug('groups.dao getLabels: exit: labels:undefined');
            return undefined;
        } else {
            const labels:string[] = JSON.parse(JSON.stringify(labelResults)) as string[];
            if (labels.length===1) {
                // all devices/groups should have 2 labels
                // if only 1 is returned it is an older version of the Neptune engine
                // which returns labels as a concatinated string (label1::label2)
                // attempt to be compatable with this
                const splitLabels:string[] = labels[0].split('::');
                if (splitLabels.length < 2) {
                    logger.error(`groups.dao getLabels: group ${groupPath} does not have correct labels`);
                    throw new Error('INVALID_LABELS');
                }
                logger.debug(`groups.dao getLabels: exit: labels: ${labels}`);
                return labels;
            } else {
                logger.debug(`groups.dao getLabels: exit: labels: ${labels}`);
                return labels;
            }
        }
    }

    public async create(n: Node, groups:{[relation:string]:string[]}): Promise<string> {
        logger.debug(`groups.full.dao create: in: n:${JSON.stringify(n)}, groups:${JSON.stringify(groups)}`);

        const id = `group___${n.attributes['groupPath']}`;
        const labels = n.types.join('::');
        const parentId = `group___${n.attributes['parentPath']}`;

        const traversal = this._g.V(parentId).as('parent').
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
                Object.keys(groups).forEach(rel=> {
                    groups[rel].forEach(v=> {
                        const groupId = `group___${v}`;
                        traversal
                            .V(groupId)
                            .addE(rel).from_('group');
                    });
                });
            }

        await traversal.next();

        logger.debug(`groups.full.dao create: exit: id:${id}`);
        return id;

    }

    public async update(n: Node): Promise<string> {
        logger.debug(`groups.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `group___${n.attributes['groupPath'].toString()}`;

        const traversal = this._g.V(id);

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

        logger.debug(`groups.full.dao update: exit: id:${id}`);
        return id;

    }

    public async listMembers(groupPath:string, category:TypeCategory, type:string, state:string, offset:number, count:number): Promise<Node[]> {
        logger.debug(`groups.full.dao getMembers: in: groupPath:${groupPath}, category:${category}, type:${type}, state:${state}, offset:${offset}, count:${count}`);

        const id = 'group___' + groupPath;

        const label = (type===undefined) ? category : type;

        const traverser = await this._g.V(id).in_()
            .hasLabel(label);

        if (category===TypeCategory.Device && state!==undefined) {
            traverser.has('state',state);
        }

        // apply pagination
        if (offset!==undefined && count!==undefined) {
            // note: workaround for wierd typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);
            traverser.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        const results = await traverser.valueMap(true).toList();

        logger.debug(`groups.full.dao getMembers: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`groups.full.dao getMembers: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            const l = (<string> result.label).split('::');
            nodes.push(this.assembler.toNode(result, l));
        }

        logger.debug(`groups.full.dao getMembers: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;

    }

    public async listParentGroups(groupPath:string): Promise<Node[]> {
        logger.debug(`groups.full.dao getParentGroups: in: groupPath:${groupPath}`);

        const id = 'group___' + groupPath;

        const results = await this._g.V(id).
            local(
                __.union(
                    __.identity().valueMap(true),
                    __.repeat(__.out('parent')).
                        emit().
                        valueMap(true))).
            toList();

        logger.debug(`groups.full.dao getParentGroups: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`groups.full.dao getParentGroups: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            const labels = (<string> result.label).split('::');
            nodes.push(this.assembler.toNode(result, labels));
        }

        logger.debug(`groups.full.dao getParentGroups: exit: node: ${JSON.stringify(nodes)}`);
        return nodes;

    }

    public async delete(groupPath: string): Promise<void> {
        logger.debug(`groups.full.dao delete: in: groupPath:${groupPath}`);

        const dbId = `group___${groupPath}`;

        await this._g.V(dbId).drop().next();

        logger.debug(`groups.full.dao delete: exit`);
    }

    public async attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.dao attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const result = await this._g.V(targetId).as('target').
            V(sourceId).as('source').addE(relationship).to('target').
            iterate();

        logger.verbose(`groups.full.dao attachToGroup: result:${JSON.stringify(result)}`);

        logger.debug(`groups.full.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.dao detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        const sourceId = `group___${sourceGroupPath}`;
        const targetId = `group___${targetGroupPath}`;

        const result = await this._g.V(sourceId).as('source').
            outE(relationship).as('edge').
            inV().has(process.t.id, targetId).as('target').
            select('edge').dedup().drop().
            iterate();

        logger.verbose(`groups.full.dao detachFromGroup: result:${JSON.stringify(result)}`);

        logger.debug(`groups.full.dao detachFromGroup: exit:`);
    }
}

export interface GetGroupResult {
    group: { [key:string]: AttributeValue};
    paths: {
        objects:string[];
    }[];
    Es: {
        label:string;
        id:string;
    }[];
    Vs: { [key:string]: AttributeValue} [];
}
