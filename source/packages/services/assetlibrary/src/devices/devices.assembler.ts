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
import { inject, injectable } from 'inversify';
import { FullAssembler } from '../data/full.assembler';
import {
    DirectionToRelatedEntityArrayMap,
    RelatedEntityArrayMap,
    RelationDirection,
    StringArrayMap,
} from '../data/model';
import { Node, StringNodeMap } from '../data/node';
import { TYPES } from '../di/types';
import { TypeCategory } from '../types/constants';
import {
    BulkDevicesResource,
    Device10Resource,
    Device20Resource,
    DeviceBaseResource,
    DeviceItem,
    DeviceItemList,
    DeviceResourceList,
    DeviceState,
    determineIfDevice20Resource,
} from './devices.models';

@injectable()
export class DevicesAssembler {
    constructor(@inject(TYPES.FullAssembler) private fullAssembler: FullAssembler) {}

    public toNode(model: DeviceItem): Node {
        logger.debug(`device.assembler toNode: in: model:${JSON.stringify(model)}`);

        const node = new Node();
        node.types.push(model.category);
        node.types.push(model.templateId);
        node.attributes['deviceId'] = model.deviceId;
        node.attributes['awsIotThingArn'] = model.awsIotThingArn;
        node.attributes['description'] = model.description;
        node.attributes['imageUrl'] = model.imageUrl;
        node.attributes['connected'] = model.connected;
        node.attributes['state'] = model.state;

        node.version = model.version;

        for (const p in model.attributes) {
            if (model.attributes.hasOwnProperty(p)) {
                node.attributes[p] = model.attributes[p];
            }
        }

        logger.debug(`device.assembler toNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public toDeviceItems(nodes: Node[]): DeviceItem[] {
        logger.debug(`device.assembler toDeviceItems: in: node: ${JSON.stringify(nodes)}`);

        const devices: DeviceItem[] = [];
        for (const node of nodes) {
            devices.push(this.toDeviceItem(node));
        }

        return devices;
    }

    public toDeviceItem(node: Node): DeviceItem {
        logger.debug(`device.assembler toDeviceItem: in: node: ${JSON.stringify(node)}`);

        if (node === undefined) {
            logger.debug(`device.assembler toDeviceItem: exit: model: undefined`);
            return undefined;
        }

        const model = new DeviceItem();

        if (node.types.indexOf(TypeCategory.Component) >= 0) {
            model.category = TypeCategory.Component;
        } else {
            model.category = TypeCategory.Device;
        }
        model.templateId = node.types.filter(
            (t) => t !== TypeCategory.Device && t !== TypeCategory.Component
        )[0];
        model.version = node.version;

        Object.keys(node.attributes).forEach((key) => {
            switch (key) {
                case 'deviceId':
                    model.deviceId = <string>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;
                case 'awsIotThingArn':
                    model.awsIotThingArn = <string>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;
                case 'description':
                    model.description = <string>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;
                case 'imageUrl':
                    model.imageUrl = <string>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;
                case 'connected':
                    model.connected = <boolean>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;
                case 'state':
                    model.state = <DeviceState>(
                        this.fullAssembler.extractPropertyValue(node.attributes[key])
                    );
                    break;

                default:
                    model.attributes[key] = this.fullAssembler.extractPropertyValue(
                        node.attributes[key]
                    );
            }
        });

        this.assembleRelated(model, node.in, 'in');

        this.assembleRelated(model, node.out, 'out');

        // remove any empty collection attributes
        if (Object.keys(model.groups?.in ?? {}).length === 0) {
            delete model.groups?.in;
        }
        if (Object.keys(model.groups?.out ?? {}).length === 0) {
            delete model.groups?.out;
        }
        if (Object.keys(model.groups ?? {}).length === 0) {
            delete model.groups;
        }
        if (Object.keys(model.devices?.in ?? {}).length === 0) {
            delete model.devices?.in;
        }
        if (Object.keys(model.devices?.out ?? {}).length === 0) {
            delete model.devices?.out;
        }
        if (Object.keys(model.devices ?? {}).length === 0) {
            delete model.devices;
        }
        if ((model.components?.length ?? 0) === 0) {
            delete model.components;
        }

        logger.debug(`device.assembler toDeviceItem: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public fromDeviceResource(res: DeviceBaseResource): DeviceItem {
        logger.debug(`device.assembler fromDeviceResource: in: res: ${JSON.stringify(res)}`);

        if (res === undefined) {
            logger.debug(`device.assembler fromDeviceResource: exit: res: undefined`);
            return undefined;
        }

        const item = new DeviceItem();

        // common properties
        Object.keys(res).forEach((key) => {
            if (key !== 'groups' && key !== 'devices') {
                item[key] = res[key];
            }
        });

        // populate version specific device info
        const assembleRelated = (
            from: StringArrayMap,
            rels: DirectionToRelatedEntityArrayMap,
            direction: RelationDirection
        ) => {
            if (from) {
                if (rels[direction] === undefined) rels[direction] = {};
                for (const [relation, ids] of Object.entries(from)) {
                    rels[direction][relation] = ids.map((id) => ({ id }));
                }
            }
        };
        if (determineIfDevice20Resource(res)) {
            // v2.0 supports both incoming and outgoing links
            const res_2_0 = res as Device20Resource;
            if (res_2_0.groups) {
                item.groups = {};
            }
            assembleRelated(res_2_0.groups?.in, item.groups, 'in');
            assembleRelated(res_2_0.groups?.out, item.groups, 'out');
            assembleRelated(res_2_0.devices?.in, item.devices, 'in');
            assembleRelated(res_2_0.devices?.out, item.devices, 'out');
        } else {
            // as v1.0 only supported outgoing links, we default all to outgoing
            const res_1_0 = res as Device10Resource;
            if (res_1_0.groups) {
                item.groups.out = {};
                assembleRelated(res_1_0.groups, item.groups, 'out');
            }
            if (res_1_0.devices) {
                item.devices.out = {};
                assembleRelated(res_1_0.devices, item.devices, 'out');
            }
        }

        logger.debug(`device.assembler fromDeviceResource: exit: item: ${JSON.stringify(item)}`);
        return item;
    }

    public fromBulkDevicesResource(res: BulkDevicesResource): DeviceItem[] {
        logger.debug(`device.assembler fromBulkDevicesResource: in: res: ${JSON.stringify(res)}`);

        if (res === undefined) {
            logger.debug(`device.assembler fromBulkDevicesResource: exit: res: undefined`);
            return undefined;
        }

        const items: DeviceItem[] = [];

        res.devices.forEach((resource) => items.push(this.fromDeviceResource(resource)));

        logger.debug(
            `device.assembler fromBulkDevicesResource: exit: items: ${JSON.stringify(items)}`
        );
        return items;
    }

    public toDeviceResource(item: DeviceItem, version: string): DeviceBaseResource {
        logger.debug(
            `device.assembler toDeviceResource: in: item: ${JSON.stringify(
                item
            )}, version:${version}`
        );

        if (item === undefined) {
            logger.debug(`device.assembler toDeviceResource: exit: item: undefined`);
            return undefined;
        }

        const assembleRelated = (from: RelatedEntityArrayMap, to: StringArrayMap) => {
            if (from) {
                for (const [relation, entities] of Object.entries(from)) {
                    if (to[relation] === undefined) {
                        to[relation] = [];
                    }
                    to[relation].push(...entities.map((entity) => entity.id));
                }
            }
        };

        let resource: DeviceBaseResource;
        if (version.startsWith('1.')) {
            // v1 specific...
            resource = new Device10Resource();
            const typedResource: Device10Resource = resource;

            // populate version specific device info
            if (item.groups) {
                typedResource.groups = {};
                assembleRelated(item.groups?.in, typedResource.groups);
                assembleRelated(item.groups?.out, typedResource.groups);
            } else {
                delete typedResource.groups;
            }
            if (item.devices) {
                typedResource.devices = {};
                assembleRelated(item.devices?.in, typedResource.devices);
                assembleRelated(item.devices?.out, typedResource.devices);
            } else {
                delete typedResource.devices;
            }
        } else {
            // v2 specific...
            resource = new Device20Resource();
            const typedResource: Device20Resource = resource;

            // populate version specific device info)
            typedResource.groups = {};
            if (item.groups?.in) {
                typedResource.groups.in = {};
            }
            assembleRelated(item.groups?.in, typedResource.groups.in);
            if (item.groups?.out) {
                typedResource.groups.out = {};
            }
            assembleRelated(item.groups?.out, typedResource.groups.out);
            if (item.devices?.in) {
                typedResource.devices.in = {};
            }
            assembleRelated(item.devices?.in, typedResource.devices.in);
            if (item.devices?.out) {
                typedResource.devices.out = {};
            }
            assembleRelated(item.devices?.out, typedResource.devices.out);
        }

        // common properties
        Object.keys(item).forEach((key) => {
            if (key !== 'groups' && key !== 'devices') {
                resource[key] = item[key];
            }
        });

        logger.debug(
            `device.assembler toDeviceResource: exit: resource: ${JSON.stringify(resource)}`
        );
        return resource;
    }

    public toDeviceResourceList(items: DeviceItemList, version: string): DeviceResourceList {
        logger.debug(
            `device.assembler toDeviceResourceList: in: items: ${JSON.stringify(
                items
            )}, version:${version}`
        );

        if (items === undefined) {
            logger.debug(`device.assembler toDeviceResourceList: exit: items: undefined`);
            return undefined;
        }

        const resources = new DeviceResourceList();
        resources.pagination = items.pagination;
        resources.results = [];

        items.results.forEach((item) =>
            resources.results.push(this.toDeviceResource(item, version))
        );

        logger.debug(
            `device.assembler toDeviceResourceList: exit: resources: ${JSON.stringify(resources)}`
        );
        return resources;
    }

    private assembleRelated(
        model: DeviceItem,
        related: StringNodeMap,
        direction: RelationDirection
    ) {
        Object.keys(related).forEach((key) => {
            const others = related[key];
            if (others !== undefined) {
                others.forEach((other) => {
                    if (other.category === TypeCategory.Group) {
                        if (model.groups[direction] === undefined) {
                            model.groups[direction] = {};
                        }
                        if (model.groups[direction][key] === undefined) {
                            model.groups[direction][key] = [];
                        }
                        model.groups[direction][key].push({
                            id: (other.attributes['groupPath'] as string[])[0],
                        });
                    } else if (other.category === TypeCategory.Device) {
                        if (model.devices[direction] === undefined) {
                            model.devices[direction] = {};
                        }
                        if (model.devices[direction][key] === undefined) {
                            model.devices[direction][key] = [];
                        }
                        model.devices[direction][key].push({
                            id: (other.attributes['deviceId'] as string[])[0],
                        });
                    } else if (other.category === TypeCategory.Component) {
                        if (model.components === undefined) {
                            model.components = [];
                        }
                        model.components.push(this.toDeviceItem(other));
                    }
                });
            }
        });
    }

    public toRelatedDeviceModelsList(
        node: Node,
        offset?: number | string,
        count?: number
    ): DeviceItemList {
        logger.debug(
            `devices.assembler toRelatedDeviceModelsList: in: node: ${JSON.stringify(node)}`
        );

        const r: DeviceItemList = {
            results: [],
        };

        if (node === undefined) {
            return r;
        }

        if (offset !== undefined || count !== undefined) {
            r.pagination = {
                offset,
                count,
            };
        }

        Object.keys(node.in).forEach((relationship) => {
            const others = node.in[relationship];
            if (others !== undefined) {
                others.forEach((other) => {
                    const device: DeviceItem = this.toDeviceItem(other);
                    device.relation = relationship;
                    device.direction = 'in';
                    r.results.push(device);
                });
            }
        });

        Object.keys(node.out).forEach((relationship) => {
            const others = node.out[relationship];
            if (others !== undefined) {
                others.forEach((other) => {
                    const device: DeviceItem = this.toDeviceItem(other);
                    device.relation = relationship;
                    device.direction = 'out';
                    r.results.push(device);
                });
            }
        });

        logger.debug(`groups.assembler toRelatedDeviceModelsList: exit: r: ${JSON.stringify(r)}`);
        return r;
    }
}
