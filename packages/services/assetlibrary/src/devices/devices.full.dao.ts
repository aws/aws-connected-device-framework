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
export class DevicesDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.CommonDao) private commonDao: CommonDaoFull,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listRelated(deviceId: string, relationship: string, direction:string, template:string, filterRelatedBy:{ [key: string] : ModelAttributeValue}, offset:number, count:number) : Promise<Node> {
        logger.debug(`devices.full.dao listRelated: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(filterRelatedBy)}, offset:${offset}, count:${count}`);

        const id = `device___${deviceId}`;
        return await this.commonDao.listRelated(id, relationship, direction, template, filterRelatedBy, offset, count);

    }

    public async get(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean): Promise<Node[]> {

        logger.debug(`device.full.dao get: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        const ids:string[] = deviceIds.map(d=> `device___${d}`);

        // build the queries for returning the info we need to assemble groups and/or component relationships
        const connectedEdgesIn = __.inE();
        const connectedEdgesOut = __.outE();
        const connectedVerticesIn = __.inE().otherV();
        const connectedVerticesOut = __.outE().otherV();

        if (expandComponents===true && includeGroups===false) {
            connectedEdgesIn.hasLabel('component_of');
            connectedEdgesOut.hasLabel('component_of');
            connectedVerticesIn.hasLabel('component_of');
            connectedVerticesOut.hasLabel('component_of');
        } else if (expandComponents===false && includeGroups===true) {
            connectedEdgesIn.not(__.hasLabel('component_of'));
            connectedEdgesOut.not(__.hasLabel('component_of'));
            connectedVerticesIn.not(__.hasLabel('component_of'));
            connectedVerticesOut.not(__.hasLabel('component_of'));
        }

        connectedEdgesIn.valueMap().with_(process.withOptions.tokens).fold();
        connectedEdgesOut.valueMap().with_(process.withOptions.tokens).fold();
        connectedVerticesIn.valueMap().with_(process.withOptions.tokens).fold();
        connectedVerticesOut.valueMap().with_(process.withOptions.tokens).fold();

        // build the query for optionally filtering the returned attributes
        const deviceValueMap = (attributes===undefined) ?
            __.valueMap().with_(process.withOptions.tokens):
            __.valueMap('state', 'deviceId', ...attributes).with_(process.withOptions.tokens);

        // assemble the main query
        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(ids).as('device');
            traverser.project('object','EsIn','EsOut','VsIn','VsOut').
                by(deviceValueMap).
                by(connectedEdgesIn).
                by(connectedEdgesOut).
                by(connectedVerticesIn).
                by(connectedVerticesOut);

            // execute and retrieve the results
            results = await traverser.toList();
            logger.debug(`device.full.dao get: query: ${traverser.toString()}`);
        } finally {
            conn.close();
        }

        if (results===undefined || results.length===0) {
            logger.debug(`device.full.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.debug(`device.full.dao get: results: ${JSON.stringify(results)}`);

        const nodes: Node[] = [];
        for(const result of results) {
            const r = JSON.parse(JSON.stringify(result)) as NodeDto;

            // assemble the device
            let node: Node;
            if (r) {
                node = this.fullAssembler.assembleNode(r.object);
                this.fullAssembler.assembleAssociations(node, r);
            }
            nodes.push(node);
        }

        logger.debug(`device.full.dao get: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async getLabels(deviceId: string): Promise<string[]> {
        logger.debug(`devices.full.dao getLabels: in: deviceId: ${deviceId}`);

        const id = 'device___' + deviceId;
        return await this.commonDao.getLabels(id);
    }

    public async create(n:Node, groups:DirectionStringToArrayMap, devices:DirectionStringToArrayMap, components:Node[]): Promise<string> {
        logger.debug(`devices.full.dao create: in: n:${JSON.stringify(n)}, groups:${groups}, devices:${JSON.stringify(devices)}, components:${components}`);

        const id = `device___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the device  */
        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.addV(labels).
                property(process.t.id, id);

            /*  set all the device properties  */
            for (const key of Object.keys(n.attributes)) {
                if (n.attributes[key]!==undefined) {
                    traversal.property(process.cardinality.single, key, n.attributes[key]);
                }
            }
            traversal.as('device');

            /*  associate with the groups  */
            if (groups) {
                if (groups.in) {
                    Object.keys(groups.in).forEach(rel=> {
                        groups.in[rel].forEach(v=> {
                            const groupId = `group___${v}`;
                            traversal.V(groupId).addE(rel).to('device');
                        });
                    });
                }
                if (groups.out) {
                    Object.keys(groups.out).forEach(rel=> {
                        groups.out[rel].forEach(v=> {
                            const groupId = `group___${v}`;
                            traversal.V(groupId).addE(rel).from_('device');
                        });
                    });
                }
            }

            /*  associate with the devices  */
            if (devices) {
                if (devices.in) {
                    Object.keys(devices.in).forEach(rel=> {
                        devices.in[rel].forEach(v=> {
                            const deviceId = `device___${v}`;
                            traversal.V(deviceId).addE(rel).to('device');
                        });
                    });
                }
                if (devices.out) {
                    Object.keys(devices.out).forEach(rel=> {
                        devices.out[rel].forEach(v=> {
                            const deviceId = `device___${v}`;
                            traversal.V(deviceId).addE(rel).from_('device');
                        });
                    });
                }
            }

            /*  create the components  */
            if (components) {
                components.forEach(c=> {
                    const componentId = (c.attributes['deviceId'] as string);
                    const componentDbId = `${id}___${componentId}`;
                    const componentLabels = c.types.join('::');

                    traversal.addV(componentLabels).
                        property(process.t.id, componentDbId);

                    for (const key of Object.keys(c.attributes)) {
                        if (c.attributes[key]!==undefined) {
                            traversal.property(process.cardinality.single, key, c.attributes[key]);
                        }
                    }

                    traversal.as(componentId).
                        addE('component_of').from_(componentId).to('device');

                });
            }

            logger.debug(`devices.full.dao create: traversal:${traversal}`);
            await traversal.iterate();
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao create: exit: id:${id}`);
        return id;

    }

    public async createComponent(deviceId:string, n:Node): Promise<string> {
        logger.debug(`devices.full.dao createComponent: in: deviceId:${deviceId}, n:${JSON.stringify(n)}`);

        const id = `device___${deviceId}`;
        const componentId = `${id}___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the component  */
        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.addV(labels).
                property(process.t.id, componentId);

            for (const key of Object.keys(n.attributes)) {
                if (n.attributes[key]!==undefined) {
                    traversal.property(process.cardinality.single, key, n.attributes[key]);
                }
            }
            traversal.as('component');

            /*  add to the parent device  */
            traversal.V(id).as('device').
                addE('component_of').from_('component').to('device');

            logger.debug(`devices.full.dao createComponent: traversal:${traversal}`);
            await traversal.iterate();
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao createComponent: exit: componentId:${componentId}`);
        return componentId;

    }

    public async update(n: Node): Promise<void> {
        logger.debug(`devices.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `device___${n.attributes['deviceId']}`;

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

            await traversal.iterate();
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao update: exit:`);

    }

    public async delete(deviceId: string): Promise<void> {
        logger.debug(`devices.full.dao delete: in: deviceId:${deviceId}`);

        const id = `device___${deviceId}`;

        const conn = super.getConnection();
        try {
            await conn.traversal.V(id).drop().iterate();
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao delete: exit`);
    }

    public async attachToGroup(deviceId:string, relationship:string, direction:string, groupPath:string) : Promise<void> {
        logger.debug(`device.full.dao attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);

        let sourceId:string;
        let targetId:string;

        if (direction==='out') {
            sourceId = `device___${deviceId}`;
            targetId = `group___${groupPath}`;
        } else {
            sourceId = `group___${groupPath}`;
            targetId = `device___${deviceId}`;
        }

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(targetId).as('target').
                V(sourceId).as('source').addE(relationship).to('target').
                iterate();

            logger.debug(`devices.full.dao attachToGroup: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(deviceId:string, relationship:string, direction:string, groupPath:string) : Promise<void> {
        logger.debug(`device.full.dao detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);

        let sourceId:string;
        let targetId:string;

        if (direction==='out') {
            sourceId = `device___${deviceId}`;
            targetId = `group___${groupPath}`;
        } else {
            sourceId = `group___${groupPath}`;
            targetId = `device___${deviceId}`;
        }

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(sourceId).as('source').
                outE(relationship).as('edge').
                inV().has(process.t.id, targetId).as('target').
                select('edge').dedup().drop().
                iterate();

            logger.debug(`devices.full.dao detachFromGroup: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao detachFromGroup: exit:`);
    }

    public async attachToDevice(deviceId:string, relationship:string, direction:string, otherDeviceId:string) : Promise<void> {
        logger.debug(`device.full.dao attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);

        const source = (direction==='out') ? deviceId : otherDeviceId;
        const target = (direction==='out') ? otherDeviceId : deviceId;

        const sourceId = `device___${source}`;
        const targetId = `device___${target}`;

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(targetId).as('other').
                V(sourceId).addE(relationship).to('other').
                iterate();

            logger.debug(`devices.full.dao attachToDevice: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao attachToDevice: exit:`);
    }

    public async detachFromDevice(deviceId:string, relationship:string, direction:string, otherDeviceId:string) : Promise<void> {
        logger.debug(`device.full.dao detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);

        const source = (direction==='out') ? deviceId : otherDeviceId;
        const target = (direction==='out') ? otherDeviceId : deviceId;

        const sourceId = `device___${source}`;
        const targetId = `device___${target}`;

        const conn = super.getConnection();
        try {
            const result = await conn.traversal.V(sourceId).
                outE(relationship).as('e').
                inV().has(process.t.id, targetId).
                select('e').dedup().drop().
                iterate();

            logger.debug(`devices.full.dao detachFromDevice: result:${JSON.stringify(result)}`);
        } finally {
            conn.close();
        }

        logger.debug(`devices.full.dao detachFromDevice: exit:`);
    }

}
