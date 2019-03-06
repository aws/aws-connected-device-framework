/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node, AttributeValue} from '../data/node';
import {TypeCategory} from '../types/constants';

const __ = process.statics;

@injectable()
export class DevicesDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async get(deviceIds:string[], includeComponents:boolean, attributes:string[], includeGroups:boolean): Promise<Node[]> {
        logger.debug(`device.full.dao get: in: deviceIds:${deviceIds}, includeComponents:${includeComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        const ids:string[] = deviceIds.map(d=> `device___${d}`);

        // build the queries for returning the info we need to assmeble groups and/or component relationships
        let connectedEdges;
        let connectedVertices;
        if (includeComponents===true && includeGroups===true) {
            connectedEdges = __.bothE().valueMap(true).fold();
            connectedVertices = __.both().dedup().valueMap(true).fold();
        } else if (includeComponents===true && includeGroups===false) {
            connectedEdges = __.bothE().hasLabel('component_of').valueMap(true).fold();
            connectedVertices = __.both().hasLabel('component_of').dedup().valueMap(true).fold();
        } else if (includeComponents===false && includeGroups===true) {
            connectedEdges = __.bothE().not(__.hasLabel('component_of')).valueMap(true).fold();
            connectedVertices = __.both().not(__.hasLabel('component_of')).dedup().valueMap(true).fold();
        }

        // build the query for optionally filtering the returned attributes
        const deviceValueMap = (attributes===undefined) ?
            __.valueMap(true) :
            __.valueMap(true, 'state', 'deviceId', ...attributes);

        // assemble the main query
        const traverser = this._g.V(ids).as('device');
        if (connectedEdges!==undefined) {
            traverser.project('device','paths','Es','Vs').
                by(deviceValueMap).
                by(__.bothE().otherV().path().by(process.t.id).fold()).
                by(connectedEdges).
                by(connectedVertices);
        } else {
            traverser.project('device','paths').
                by(deviceValueMap).
                by(__.bothE().otherV().path().by(process.t.id).fold());
        }

        // execute and retrieve the resutls
        const results = await traverser.toList();
        // logger.debug(`device.full.dao get: query: ${JSON.stringify(query)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`device.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        for(const result of results) {
            const r = JSON.parse(JSON.stringify(result)) as GetDeviceResult;

            // assemble the device
            let node: Node;
            if (r) {
                node = this.assembleNode(r.device);
                this.assembleAssociations(node, r);
            }
            nodes.push(node);
        }

        logger.debug(`device.full.dao get: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async getLabels(deviceId: string): Promise<string[]> {
        logger.debug(`devices.dao getLabels: in: deviceId: ${deviceId}`);

        const id = 'device___' + deviceId;

        const labelResults = await this._g.V(id).label().toList();

        if (labelResults===undefined || labelResults.length===0) {
            logger.debug('devices.dao getLabels: exit: labels:undefined');
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
                    logger.error(`devices.dao getLabels: device ${deviceId} does not have correct labels`);
                    throw new Error('INVALID_LABELS');
                }
                logger.debug(`devices.dao getLabels: exit: labels: ${labels}`);
                return labels;
            } else {
                logger.debug(`devices.dao getLabels: exit: labels: ${labels}`);
                return labels;
            }
        }
    }

    private assembleNode(device:{ [key:string]: AttributeValue}):Node {
        logger.debug(`devices.dao assembleNode: in: device: ${JSON.stringify(device)}`);

        const labels = (<string> device['label']).split('::');
        const node = new Node();
        Object.keys(device).forEach( key => {
            if (key==='id') {
                node.id = <string> device[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = device[key] ;
            }
        });

        logger.debug(`devices.dao assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    private assembleAssociations(node:Node, r:GetDeviceResult) {

        // assemble all associated objects
        r.paths.forEach((value)=> {
            const eId = value.objects[1];
            const direction = (value.objects[0]===r.device.id) ? 'out' : 'in';
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
                } else if (l.includes(TypeCategory.Component)) {
                    const other = this.assembleNode(v[0]);
                    other.category = TypeCategory.Component;
                    node.addLink(direction, e[0]['label'], other);
                } else if (l.includes(TypeCategory.Device)) {
                    const other = this.assembleNode(v[0]);
                    other.category = TypeCategory.Device;
                    node.addLink(direction, e[0]['label'], other);
                } else {
                    logger.warn(`assembleAssociations does not yet support handling ${l}`);
                }
            }
        });
    }

    public async create(n:Node, groups:{[relation:string]:string[]}, components:Node[]): Promise<string> {
        logger.debug(`devices.dao create: in: n:${JSON.stringify(n)}, groups:${groups}, components:${components}`);

        const id = `device___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the device  */
        const traversal = this._g.addV(labels).
            property(process.t.id, id);

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key]!==undefined) {
                traversal.property(process.cardinality.single, key, n.attributes[key]);
            }
        }
        traversal.as('device');

        /*  associate with the groups  */
        if (groups) {
            Object.keys(groups).forEach(rel=> {
                groups[rel].forEach(v=> {
                    const groupId = `group___${v}`;
                    traversal
                        .V(groupId)
                        .addE(rel).from_('device');
                });
            });
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

        logger.debug(`devices.dao create: traversal:${traversal}`);
        await traversal.iterate();

        logger.debug(`devices.dao create: exit: id:${id}`);
        return id;

    }

    public async createComponent(deviceId:string, n:Node): Promise<string> {
        logger.debug(`devices.dao createComponent: in: deviceId:${deviceId}, n:${JSON.stringify(n)}`);

        const id = `device___${deviceId}`;
        const componentId = `${id}___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the component  */
        const traversal = this._g.addV(labels).
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

        logger.debug(`devices.dao createComponent: traversal:${traversal}`);
        await traversal.iterate();

        logger.debug(`devices.dao createComponent: exit: componentId:${componentId}`);
        return componentId;

    }

    public async update(n: Node): Promise<void> {
        logger.debug(`devices.dao update: in: n:${JSON.stringify(n)}`);

        const id = `device___${n.attributes['deviceId']}`;

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

        await traversal.iterate();

        logger.debug(`devices.dao update: exit:`);

    }

    public async delete(deviceId: string): Promise<void> {
        logger.debug(`devices.dao delete: in: deviceId:${deviceId}`);

        const id = `device___${deviceId}`;

        await this._g.V(id).drop().iterate();

        logger.debug(`devices.dao delete: exit`);
    }

    public async attachToGroup(deviceId:string, relationship:string, groupPath:string) : Promise<void> {
        logger.debug(`device.full.dao attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);

        const id = `device___${deviceId}`;
        const groupId = `group___${groupPath}`;

        const result = await this._g.V(groupId).as('group').
            V(id).as('device').addE(relationship).to('group').
            iterate();

        logger.debug(`devices.dao attachToGroup: result:${JSON.stringify(result)}`);

        logger.debug(`devices.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(deviceId:string, relationship:string, groupPath:string) : Promise<void> {
        logger.debug(`device.full.dao detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);

        const id = `device___${deviceId}`;
        const groupId = `group___${groupPath}`;

        const result = await this._g.V(id).as('device').
            outE(relationship).as('edge').
            inV().has(process.t.id, groupId).as('group').
            select('edge').dedup().drop().
            iterate();

        logger.debug(`devices.dao detachFromGroup: result:${JSON.stringify(result)}`);

        logger.debug(`devices.dao detachFromGroup: exit:`);
    }

    public async attachToDevice(deviceId:string, relationship:string, otherDeviceId:string) : Promise<void> {
        logger.debug(`device.full.dao attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);

        const id = `device___${deviceId}`;
        const otherId = `device___${otherDeviceId}`;

         const result = await this._g.V(otherId).as('other').
            V(id).addE(relationship).to('other').
            iterate();

        logger.debug(`devices.dao attachToDevice: result:${JSON.stringify(result)}`);

        logger.debug(`devices.dao attachToDevice: exit:`);
    }

    public async detachFromDevice(deviceId:string, relationship:string, otherDeviceId:string) : Promise<void> {
        logger.debug(`device.full.dao detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);

        const id = `device___${deviceId}`;
        const otherId = `device___${otherDeviceId}`;

        const result = await this._g.V(id).
            outE(relationship).as('e').
            inV().has(process.t.id, otherId).
            select('e').dedup().drop().
            iterate();

        logger.debug(`devices.dao detachFromDevice: result:${JSON.stringify(result)}`);

        logger.debug(`devices.dao detachFromDevice: exit:`);
    }

}

export interface GetDeviceResult {
    device: { [key:string]: AttributeValue};
    paths: {
        objects:string[];
    }[];
    Es: {
        label:string;
        id:string;
    }[];
    Vs: { [key:string]: AttributeValue} [];
}
