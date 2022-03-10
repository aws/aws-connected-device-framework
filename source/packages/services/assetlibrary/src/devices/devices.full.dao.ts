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
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node} from '../data/node';
import { FullAssembler } from '../data/full.assembler';
import { ModelAttributeValue, DirectionStringToArrayMap, SortKeys } from '../data/model';
import { BaseDaoFull } from '../data/base.full.dao';
import { CommonDaoFull } from '../data/common.full.dao';
import { isRelatedEntityDto, isVertexDto, RelatedEntityDto, VertexDto } from '../data/full.model';

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

    public async listRelated(deviceId: string, relationship: string, direction:string, template:string, filterRelatedBy:{ [key: string] : ModelAttributeValue}, offset:number, count:number, sort:SortKeys) : Promise<Node> {
        logger.debug(`devices.full.dao listRelated: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(filterRelatedBy)}, offset:${offset}, count:${count}, sort:${sort}`);

        const id = `device___${deviceId}`;
        return await this.commonDao.listRelated(id, relationship, direction, template, filterRelatedBy, offset, count, sort);

    }

    public async get(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean): Promise<Node[]> {

        logger.debug(`device.full.dao get: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        const dbIds:string[] = deviceIds.map(d=> `device___${d}`);

        // define the traversers that handle finding associated groups/components
        const relatedIn = __.inE();
        const relatedOut = __.outE();

        [relatedIn, relatedOut].forEach(t=> {
            if (expandComponents && !includeGroups) {
                t.hasLabel('component_of');
            } else if (!expandComponents && includeGroups) {
                t.not(__.hasLabel('component_of'));
            }
        });

        relatedIn.as('e')
            .outV().as('v')
            .valueMap().with_(process.withOptions.tokens).as('vProps')
            .constant('in').as('dir')
            .select('entityId','dir','e','vProps');

        relatedOut.as('e')
            .inV().as('v')
            .valueMap().with_(process.withOptions.tokens).as('vProps')
            .constant('out').as('dir')
            .select('entityId','dir','e','vProps');

        // build the traverser for returning the devices, optionally filtering the returned attributes
        const deviceProps = (attributes===undefined) ?
            __.select('devices').valueMap().with_(process.withOptions.tokens):
            __.select('devices').valueMap('state', 'deviceId', ...attributes).with_(process.withOptions.tokens);

        // build the main part of the query, unioning the related traversers with the main entity we want to return
        let results: process.Traverser[];
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(dbIds).as('devices')
                .values('deviceId').as('entityId')
                .select('devices').union(
                    relatedIn, relatedOut, deviceProps
                );

            // execute and retrieve the results
            logger.debug(`common.full.dao listRelated: traverser: ${JSON.stringify(traverser.toString())}`);
            results = await traverser.toList();
            logger.debug(`common.full.dao listRelated: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results===undefined || results.length===0) {
            logger.debug(`device.full.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.debug(`device.full.dao get: results: ${JSON.stringify(results)}`);

        // the result should contain verticesx representing the entities requested as individual rows, then all requested relations as other rows
        // find the main entities first
        const nodes: Node[] = [];
        const devices = results.filter(r=> isVertexDto(r)) as VertexDto[];
        devices.forEach(d=> {
            // construct the node
            const node = this.fullAssembler.assembleNode(d);
            // find any reltions for the device
            const relatedEntities = results.filter(r=> isRelatedEntityDto(r) && r.entityId===d['deviceId'][0])
                .map(r=> r as unknown as RelatedEntityDto);

            relatedEntities.forEach(r=> this.fullAssembler.assembleAssociation(node,r));
            nodes.push(node);
        });

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
            await conn.close();
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
            await conn.close();
        }

        logger.debug(`devices.full.dao createComponent: exit: componentId:${componentId}`);
        return componentId;

    }

    public async update(n: Node): Promise<void> {
        logger.debug(`devices.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `device___${n.attributes['deviceId']}`;

        const conn = super.getConnection();
        try {
          const updateTraversal = conn.traversal.V(id);
          const dropTraversals = [];
        
          for (const key of Object.keys(n.attributes)) {
            const val = n.attributes[key];
            if (val !== undefined) {
              if (val === null) {
                dropTraversals.push(conn.traversal.V(id).properties(key).drop());
              } else {
                updateTraversal.property(process.cardinality.single, key, val);
              }
            }
          }
        
          await updateTraversal.iterate();
          for(const dropTraversal of dropTraversals){
            await dropTraversal.iterate();
          }
        } finally {
          await conn.close();
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
            await conn.close();
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
            await conn.close();
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
            await conn.close();
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
            await conn.close();
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
            await conn.close();
        }

        logger.debug(`devices.full.dao detachFromDevice: exit:`);
    }

}
