/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node} from '../data/node';
import { FullAssembler, NodeDto } from '../data/full.assembler';
import { ModelAttributeValue, DirectionStringToArrayMap } from '../data/model';

const __ = process.statics;

@injectable()
export class GroupsDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
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
        const result = await this._g.V(id).as('object').
            project('object','pathsIn','pathsOut','Es','Vs').
                by(__.valueMap().with_(process.withOptions.tokens)).
                by(__.inE().otherV().hasLabel('group').path().by(process.t.id).fold()).
                by(__.outE().not(__.hasLabel('parent')).otherV().hasLabel('group').path().by(process.t.id).fold()).
                by(__.bothE().where(__.otherV().hasLabel('group')).valueMap().with_(process.withOptions.tokens).fold()).
                by(__.bothE().otherV().hasLabel('group').dedup().valueMap().with_(process.withOptions.tokens).fold()).
            next();

        logger.debug(`groups.full.dao get: query: ${JSON.stringify(result)}`);

        if (result.value===null) {
            logger.debug(`groups.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const value = result.value as process.Traverser;
        const r = JSON.parse(JSON.stringify(value)) as NodeDto;
        let node: Node;
        if (r) {
            node = this.fullAssembler.assembleGroupNode(r.object);
            this.fullAssembler.assembleAssociations(node, r);
        }

        logger.debug(`groups.full.dao get: exit: node: ${JSON.stringify(node)}`);
        return node;

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

    public async create(n: Node, groups:DirectionStringToArrayMap): Promise<string> {
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

    public async listRelated(groupPath: string, relationship: string, direction:string, template:string, filterRelatedBy:{[key:string]:ModelAttributeValue}, offset:number, count:number) : Promise<Node> {
        logger.debug(`groups.full.dao listRelated: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(filterRelatedBy)}, offset:${offset}, count:${count}`);

        const id = `group___${groupPath}`;

        // build the queries for returning the info we need to assmeble related devices
        let connectedEdges:process.GraphTraversal;
        let connectedVertices:process.GraphTraversal;
        if (direction==='in') {
            connectedEdges = __.inE();
            connectedVertices = __.in_();
        } else if (direction==='out') {
            connectedEdges = __.outE();
            connectedVertices = __.out();
        } else {
            connectedEdges = __.bothE();
            connectedVertices = __.both();
        }
        if (relationship!=='*') {
            connectedEdges.hasLabel(relationship);
            connectedVertices.hasLabel(template);
        }
        connectedEdges.where(__.otherV().hasLabel(template)).valueMap().with_(process.withOptions.tokens).fold();

        if (filterRelatedBy!==undefined) {
            Object.keys(filterRelatedBy).forEach(k=> {
                connectedVertices.has(k, filterRelatedBy[k]);
            });
        }
        connectedVertices.dedup().valueMap().with_(process.withOptions.tokens).fold();

        // assemble the main query
        const traverser = this._g.V(id).as('object');

        traverser.project('object','pathsIn','pathsOut','Es','Vs').
            by(__.valueMap().with_(process.withOptions.tokens)).
            by(__.inE().otherV().path().by(process.t.id).fold()).
            by(__.outE().otherV().path().by(process.t.id).fold()).
            by(connectedEdges).
            by(connectedVertices);

        // apply pagination
        if (offset!==undefined && count!==undefined) {
            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);
            traverser.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        // execute and retrieve the results
        logger.debug(`groups.full.dao listRelatedDevices: traverser: ${traverser}`);
        const results = await traverser.toList();
        logger.debug(`devices.full.dao listRelatedDevices: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`groups.full.dao listRelatedDevices: exit: node: undefined`);
            return undefined;
        }

        // there should be only one result as its by deviceId, but we still process as an array so we can reuse the existing assemble methods
        const nodes: Node[] = [];
        for(const result of results) {
            const r = JSON.parse(JSON.stringify(result)) as NodeDto;

            // assemble the device
            let node: Node;
            if (r) {
                node = this.fullAssembler.assembleDeviceNode(r.object);
                this.fullAssembler.assembleAssociations(node, r);
            }
            nodes.push(node);
        }

        logger.debug(`groups.full.dao listRelatedDevices: exit: node: ${JSON.stringify(nodes[0])}`);
        return nodes[0];

    }

    public async listParentGroups(groupPath:string): Promise<Node[]> {
        logger.debug(`groups.full.dao getParentGroups: in: groupPath:${groupPath}`);

        const id = 'group___' + groupPath;

        const results = await this._g.V(id).
            local(
                __.union(
                    __.identity().valueMap().with_(process.withOptions.tokens),
                    __.repeat(__.out('parent')).
                        emit().
                        valueMap().with_(process.withOptions.tokens))).
            toList();

        logger.debug(`groups.full.dao getParentGroups: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`groups.full.dao getParentGroups: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            nodes.push(this.fullAssembler.assembleGroupNode(result));
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
