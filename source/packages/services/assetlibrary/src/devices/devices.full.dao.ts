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
import ow from 'ow';
import { Claims } from '../authz/claims';
import { BaseDaoFull } from '../data/base.full.dao';
import { CommonDaoFull } from '../data/common.full.dao';
import { FullAssembler } from '../data/full.assembler';
import { RelatedEntityDto, VertexDto, isRelatedEntityDto, isVertexDto } from '../data/full.model';
import {
    DirectionToRelatedEntityArrayMap,
    EntityTypeMap,
    ModelAttributeValue,
    RelatedEntityArrayMap,
    RelatedEntityIdentifer,
    RelationDirection,
    SortKeys,
} from '../data/model';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { DevicesAssembler } from './devices.assembler';
import { DeviceItem } from './devices.models';

const __ = process.statics;

/*  associate device with the related devices and/or groups  */
const associateRels = (
    traversal: process.GraphTraversal,
    rels: RelatedEntityArrayMap,
    category: 'device' | 'group',
    direction: RelationDirection
) => {
    console.debug(
        'devices.full.dao associateRels:',
        JSON.stringify({ rels, category, direction })
    );
    if (Object.keys(rels ?? {}).length > 0) {
        Object.entries(rels).forEach(([rel, entities]) => {
            entities.forEach((entity) => {
                const target = `${category}___${entity.id}`;
                if (direction === 'in') {
                    logger.debug(`Adding relationship ${rel} from ${target} to device`);
                    traversal.V(target).addE(rel).to('device');
                } else {
                    logger.debug(`Adding relationship ${rel} to ${target} from device`);
                    traversal.V(target).addE(rel).from_('device');
                }
                if (entity.isAuthCheck) {
                    traversal.property(process.cardinality.single, 'isAuthCheck', true);
                }
            });
        });
    }
};

const diassociateRels = (
    dropTraversals: process.GraphTraversal[],
    rels: RelatedEntityArrayMap,
    category: 'device' | 'group',
    direction: RelationDirection
) => {
    console.debug(
        'devices.full.dao diassociateRels:',
        JSON.stringify({ rels, category, direction })
    );
    if (Object.keys(rels ?? {}).length > 0) {
        Object.entries(rels).forEach(([rel, entities]) => {
            entities.forEach((entity) => {
                const target = `${category}___${entity.id}`;
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
export class DevicesDaoFull extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.CommonDao) private commonDao: CommonDaoFull,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject('authorization.enabled') private isAuthzEnabled: boolean
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listRelated(
        deviceId: string,
        relationship: string,
        direction: string,
        template: string,
        filterRelatedBy: { [key: string]: ModelAttributeValue },
        offset: number,
        count: number,
        sort: SortKeys
    ): Promise<Node> {
        logger.debug(
            `devices.full.dao listRelated: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(
                filterRelatedBy
            )}, offset:${offset}, count:${count}, sort:${sort}`
        );

        const id = `device___${deviceId}`;

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

    public async get(
        deviceIds: string[],
        expandComponents: boolean,
        attributes: string[],
        includeGroups: boolean
    ): Promise<Node[]> {
        logger.debug(
            `device.full.dao get: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`
        );

        const dbIds: string[] = deviceIds.map((d) => `device___${d}`);

        // define the traversers that handle finding associated groups/components
        const relatedIn = __.inE();
        const relatedOut = __.outE();

        [relatedIn, relatedOut].forEach((t) => {
            if (expandComponents && !includeGroups) {
                t.hasLabel('component_of');
            } else if (!expandComponents && includeGroups) {
                t.not(__.hasLabel('component_of'));
            }
        });

        relatedIn
            .as('e')
            .outV()
            .as('v')
            .valueMap()
            .with_(process.withOptions.tokens)
            .as('vProps')
            .constant('in')
            .as('dir')
            .select('entityId', 'dir', 'e', 'vProps');

        relatedOut
            .as('e')
            .inV()
            .as('v')
            .valueMap()
            .with_(process.withOptions.tokens)
            .as('vProps')
            .constant('out')
            .as('dir')
            .select('entityId', 'dir', 'e', 'vProps');

        // build the traverser for returning the devices, optionally filtering the returned attributes
        const deviceProps =
            attributes === undefined
                ? __.select('devices').valueMap().with_(process.withOptions.tokens)
                : __.select('devices')
                      .valueMap('state', 'deviceId', ...attributes)
                      .with_(process.withOptions.tokens);

        // build the main part of the query, unioning the related traversers with the main entity we want to return
        let results: process.Traverser[];
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(dbIds)
                .as('devices')
                .values('deviceId')
                .as('entityId')
                .select('devices')
                .union(relatedIn, relatedOut, deviceProps);

            // execute and retrieve the results
            logger.debug(
                `common.full.dao listRelated: traverser: ${JSON.stringify(traverser.toString())}`
            );
            results = await traverser.toList();
            logger.debug(`common.full.dao listRelated: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if ((results?.length ?? 0) === 0) {
            logger.debug(`device.full.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.debug(`device.full.dao get: results: ${JSON.stringify(results)}`);

        // the result should contain vertices representing the entities requested as individual rows, then all requested relations as other rows
        // find the main entities first
        const nodes: Node[] = [];
        const devices = results.filter((r) => isVertexDto(r)) as VertexDto[];
        devices.forEach((d) => {
            // construct the node
            const node = this.fullAssembler.assembleNode(d);
            // find any relations for the device
            const relatedEntities = results
                .filter((r) => isRelatedEntityDto(r) && r.entityId === d['deviceId'][0])
                .map((r) => r as unknown as RelatedEntityDto);

            relatedEntities.forEach((r) => this.fullAssembler.assembleAssociation(node, r));
            nodes.push(node);
        });

        logger.debug(`device.full.dao get: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

    public async getLabels(deviceIds: string[]): Promise<EntityTypeMap> {
        logger.debug(`devices.full.dao getLabels: in: deviceId: ${deviceIds}`);

        if ((deviceIds?.length ?? 0) === 0) {
            return {};
        }

        const dbIds = deviceIds.map((d) => `device___${d}`);
        const result = await this.commonDao.getLabels(dbIds);
        Object.entries(result).forEach(
            ([id, labels]) =>
                (result[id] = labels.filter((l) => l !== 'device' && l !== 'component'))
        );
        logger.debug(`devices.full.dao getLabels: result: ${JSON.stringify(result)}`);
        return result;
    }

    public async create(
        n: Node,
        groups: DirectionToRelatedEntityArrayMap,
        devices: DirectionToRelatedEntityArrayMap,
        components: Node[]
    ): Promise<string> {
        logger.debug(
            `devices.full.dao create: in: n:${JSON.stringify(n)}, groups:${JSON.stringify(
                groups
            )}, devices:${JSON.stringify(devices)}, components:${components}`
        );

        const id = `device___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the device  */
        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.addV(labels).property(process.t.id, id);

            /*  set all the device properties  */
            for (const key of Object.keys(n.attributes)) {
                if (n.attributes[key] !== undefined) {
                    traversal.property(process.cardinality.single, key, n.attributes[key]);
                }
            }
            traversal.as('device');

            /* associate device with the related devices and/or groups */
            associateRels(traversal, groups?.in, 'group', 'in');
            associateRels(traversal, groups?.out, 'group', 'out');
            associateRels(traversal, devices?.in, 'device', 'in');
            associateRels(traversal, devices?.out, 'device', 'out');

            /*  create the components  */
            if (components) {
                components.forEach((c) => {
                    const componentId = c.attributes['deviceId'] as string;
                    const componentDbId = `${id}___${componentId}`;
                    const componentLabels = c.types.join('::');

                    traversal.addV(componentLabels).property(process.t.id, componentDbId);

                    for (const key of Object.keys(c.attributes)) {
                        if (c.attributes[key] !== undefined) {
                            traversal.property(process.cardinality.single, key, c.attributes[key]);
                        }
                    }

                    traversal.as(componentId).addE('component_of').from_(componentId).to('device');
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

    public async createComponent(deviceId: string, n: Node): Promise<string> {
        logger.debug(
            `devices.full.dao createComponent: in: deviceId:${deviceId}, n:${JSON.stringify(n)}`
        );

        const id = `device___${deviceId}`;
        const componentId = `${id}___${n.attributes['deviceId']}`;
        const labels = n.types.join('::');

        /*  create the component  */
        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.addV(labels).property(process.t.id, componentId);

            for (const key of Object.keys(n.attributes)) {
                if (n.attributes[key] !== undefined) {
                    traversal.property(process.cardinality.single, key, n.attributes[key]);
                }
            }
            traversal.as('component');

            /*  add to the parent device  */
            traversal.V(id).as('device').addE('component_of').from_('component').to('device');

            /* for simplification, always add isAuthCheck from the component to the device, regardless fo whether used or not */
            traversal.property(process.cardinality.single, 'isAuthCheck', true);

            logger.debug(`devices.full.dao createComponent: traversal:${traversal}`);
            await traversal.iterate();
        } finally {
            await conn.close();
        }

        logger.debug(`devices.full.dao createComponent: exit: componentId:${componentId}`);
        return componentId;
    }

    public async update(
        n: Node,
        groups?: DirectionToRelatedEntityArrayMap,
        devices?: DirectionToRelatedEntityArrayMap
    ): Promise<void> {
        logger.debug(`devices.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `device___${n.attributes['deviceId']}`;

        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.V(id).as('device');
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

            // Check if related groups or devices part of update request
            if (groups !== undefined && (groups.in || groups.out || devices.in || devices.out)){
                // Update request contains relationships to enforce. This requires current
                // relationships be dropped where specified and new relations created.
                logger.info(
                    `devices.full.dao update groups/devices relations specified as part of update: ${JSON.stringify(
                        { groups: groups }
                    )}/${JSON.stringify({ devices: devices })}`
                );
                const result = await this.get([`${n.attributes['deviceId']}`], false, [], false);
                let currentDevice: DeviceItem;
                if (result !== undefined && result.length > 0) {
                    currentDevice = this.devicesAssembler.toDeviceItem(result[0]);
                }
                const existingGroups = currentDevice.groups ? currentDevice.groups : {};
                const existingDevices = currentDevice.devices ? currentDevice.devices : {};
                logger.debug(`Current device defintion: ${JSON.stringify(currentDevice)}`);
                // Methodology
                // 1. Collect relations to be dropped as independent traversal objects via diassociateRels
                // 2. Union and then drop() these with traversal.sideEffect(...)
                //    -- Use of sideEffect acts on the traversal then passes results to next step. Without this, a drop() will terminate traversal.
                // 3. Add specified relations for groups and devices directly to traversal in associateRels
                const relationsToDropTraversals: process.GraphTraversal[] = [];
                if (groups.in && 'in' in existingGroups) {
                    logger.debug(
                        `devices.full.dao update device ${id} dropping existing relations for groups.in: ${JSON.stringify(
                            existingGroups.in
                        )}`
                    );
                    diassociateRels(relationsToDropTraversals, existingGroups.in, 'group', 'in');
                }
                if (groups.out && 'out' in existingGroups) {
                    logger.debug(
                        `devices.full.dao update device ${id} dropping existing relations for groups.out: ${JSON.stringify(
                            existingGroups.out
                        )}`
                    );
                    diassociateRels(relationsToDropTraversals, existingGroups.out, 'group', 'out');
                }
                if (devices.in && 'in' in existingDevices) {
                    logger.debug(
                        `devices.full.dao update device ${id} dropping existing relations for devices.in: ${JSON.stringify(
                            existingDevices.in
                        )}`
                    );
                    diassociateRels(relationsToDropTraversals, existingDevices.in, 'device', 'in');
                }
                if (devices.out && 'out' in existingDevices) {
                    logger.debug(
                        `devices.full.dao update device ${id} dropping existing relations for devices.out:: ${JSON.stringify(
                            existingDevices.out
                        )}`
                    );
                    diassociateRels(
                        relationsToDropTraversals,
                        existingDevices.out,
                        'device',
                        'out'
                    );
                }
                traversal.sideEffect(__.union(...relationsToDropTraversals).drop());
                if (groups.in) {
                    logger.debug(
                        `devices.full.dao update device ${id} adding relations for groups.in: ${JSON.stringify(
                            groups.in
                        )}`
                    );
                    associateRels(traversal, groups.in, 'group', 'in');
                }
                if (groups.out) {
                    logger.debug(
                        `devices.full.dao update device ${id} adding relations for groups.out: ${JSON.stringify(
                            groups.out
                        )}`
                    );
                    associateRels(traversal, groups.out, 'group', 'out');
                }
                if (devices.in) {
                    logger.debug(
                        `devices.full.dao update device ${id} adding relations for devices.in: ${JSON.stringify(
                            devices.in
                        )}`
                    );
                    associateRels(traversal, devices.in, 'device', 'in');
                }
                if (devices.out) {
                    logger.debug(
                        `devices.full.dao update device ${id} adding relations for devices.out: ${JSON.stringify(
                            devices.out
                        )}`
                    );
                    associateRels(traversal, devices.out, 'device', 'out');
                }
            }
            if (dropTraversals.length > 0) {
                traversal.local(__.union(...dropTraversals)).drop();
            }
            logger.debug(
                `devices.full.dao update traversal before iterate is: ${JSON.stringify(traversal)}`
            );
            await traversal.iterate();
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

    public async attachToGroup(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        groupPath: string,
        isAuthCheck: boolean
    ): Promise<void> {
        logger.debug(
            `device.full.dao attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`
        );

        let sourceId: string;
        let targetId: string;

        if (direction === 'out') {
            sourceId = `device___${deviceId}`;
            targetId = `group___${groupPath}`;
        } else {
            sourceId = `group___${groupPath}`;
            targetId = `device___${deviceId}`;
        }

        const conn = super.getConnection();
        try {
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

            logger.debug(`devices.full.dao attachToGroup: result:${JSON.stringify(result)}`);
        } finally {
            await conn.close();
        }

        logger.debug(`devices.full.dao attachToGroup: exit:`);
    }

    public async detachFromGroups(
        deviceId: string,
        relations: RelatedEntityIdentifer[]
    ): Promise<void> {
        logger.debug(
            `device.full.dao detachFromGroups: in: deviceId:${deviceId}, relations:${JSON.stringify(
                relations
            )}`
        );

        await this.detachFromOthers(
            deviceId,
            relations.map((r) => ({
                relationship: r.relationship,
                direction: r.direction,
                targetId: `group___${r.targetId}`,
            }))
        );

        logger.debug(`devices.full.dao detachFromGroups: exit:`);
    }

    public async attachToDevice(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        otherDeviceId: string,
        isAuthCheck: boolean
    ): Promise<void> {
        logger.debug(
            `device.full.dao attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`
        );

        const source = direction === 'out' ? deviceId : otherDeviceId;
        const target = direction === 'out' ? otherDeviceId : deviceId;

        const sourceId = `device___${source}`;
        const targetId = `device___${target}`;

        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(targetId)
                .as('other')
                .V(sourceId)
                .addE(relationship)
                .to('other');

            if (isAuthCheck) {
                traverser.property(process.cardinality.single, 'isAuthCheck', true);
            }

            const result = await traverser.iterate();
            logger.debug(`devices.full.dao attachToDevice: result:${JSON.stringify(result)}`);
        } finally {
            await conn.close();
        }

        logger.debug(`devices.full.dao attachToDevice: exit:`);
    }

    public async detachFromDevices(
        deviceId: string,
        relations: RelatedEntityIdentifer[]
    ): Promise<void> {
        logger.debug(
            `device.full.dao detachFromDevices: in: deviceId:${deviceId}, relations:${JSON.stringify(
                relations
            )}`
        );

        await this.detachFromOthers(
            deviceId,
            relations.map((r) => ({
                relationship: r.relationship,
                direction: r.direction,
                targetId: `device___${r.targetId}`,
            }))
        );

        logger.debug(`devices.full.dao detachFromDevices: exit:`);
    }

    public async detachFromOthers(
        deviceId: string,
        relations: RelatedEntityIdentifer[]
    ): Promise<void> {
        logger.debug(
            `device.full.dao detachFromOthers: in: deviceId:${deviceId}, relations:${JSON.stringify(
                relations
            )}`
        );

        ow(deviceId, ow.string.nonEmpty);
        ow(relations, ow.array.minLength(1));

        const edgesToDelete: process.GraphTraversal[] = [];
        for (const rel of relations) {
            ow(rel.relationship, ow.string.nonEmpty);
            ow(rel.direction, ow.string.oneOf(['in', 'out']));
            ow(rel.targetId, ow.string.nonEmpty);

            let t: process.GraphTraversal;
            if (rel.direction === 'out') {
                t = __.outE(rel.relationship).as('e');
            } else {
                t = __.inE(rel.relationship).as('e');
            }

            t.otherV().has(process.t.id, rel.targetId).select('e');

            edgesToDelete.push(t);
        }

        const conn = super.getConnection();
        try {
            await conn.traversal
                .V(`device___${deviceId}`)
                .as('source')
                .union(...edgesToDelete)
                .drop()
                .iterate();
        } finally {
            await conn.close();
        }

        logger.debug(`devices.full.dao detachFromOthers: exit:`);
    }
}
