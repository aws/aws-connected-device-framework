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
        logger.silly(`device.assembler toNode: in: model:${JSON.stringify(model)}`);

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

        logger.silly(`device.assembler toNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public toDeviceItems(nodes: Node[]): DeviceItem[] {
        logger.silly(`device.assembler toDeviceItems: in: node: ${JSON.stringify(nodes)}`);

        const devices: DeviceItem[] = [];
        for (const node of nodes) {
            devices.push(this.toDeviceItem(node));
        }

        return devices;
    }

    public toDeviceItem(node: Node): DeviceItem {
        logger.silly(`device.assembler toDeviceItem: in: node: ${JSON.stringify(node)}`);

        if (node === undefined) {
            logger.silly(`device.assembler toDeviceItem: exit: model: undefined`);
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
        if (model.groups && model.groups.in && Object.keys(model.groups.in).length === 0) {
            delete model.groups.in;
        }
        if (model.groups && model.groups.out && Object.keys(model.groups.out).length === 0) {
            delete model.groups.out;
        }
        if (Object.keys(model.groups).length === 0) {
            delete model.groups;
        }
        if (model.devices && model.devices.in && Object.keys(model.devices.in).length === 0) {
            delete model.devices.in;
        }
        if (model.devices && model.devices.out && Object.keys(model.devices.out).length === 0) {
            delete model.devices.out;
        }
        if (Object.keys(model.devices).length === 0) {
            delete model.devices;
        }
        if (model.components && model.components.length === 0) {
            delete model.components;
        }

        logger.silly(`device.assembler toDeviceItem: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public fromDeviceResource(res: DeviceBaseResource): DeviceItem {
        logger.silly(`device.assembler fromDeviceResource: in: res: ${JSON.stringify(res)}`);

        if (res === undefined) {
            logger.silly(`device.assembler fromDeviceResource: exit: res: undefined`);
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
        if (determineIfDevice20Resource(res)) {
            // v2.0 supports both incoming and outgoing links
            const res_2_0 = res as Device20Resource;
            item.groups = res_2_0.groups;
            item.devices = res_2_0.devices;
        } else {
            // as v1.0 only supported outgoing links, we default all to outgoing
            const res_1_0 = res as Device10Resource;
            if (res_1_0.groups) {
                item.groups = { out: {} };
                Object.keys(res_1_0.groups).forEach(
                    (rel) => (item.groups.out[rel] = res_1_0.groups[rel])
                );
            }
            if (res_1_0.devices) {
                item.devices = { out: {} };
                Object.keys(res_1_0.devices).forEach(
                    (rel) => (item.devices.out[rel] = res_1_0.devices[rel])
                );
            }
        }

        logger.silly(`device.assembler fromDeviceResource: exit: item: ${JSON.stringify(item)}`);
        return item;
    }

    public fromBulkDevicesResource(res: BulkDevicesResource): DeviceItem[] {
        logger.silly(`device.assembler fromBulkDevicesResource: in: res: ${JSON.stringify(res)}`);

        if (res === undefined) {
            logger.silly(`device.assembler fromBulkDevicesResource: exit: res: undefined`);
            return undefined;
        }

        const items: DeviceItem[] = [];

        res.devices.forEach((resource) => items.push(this.fromDeviceResource(resource)));

        logger.silly(
            `device.assembler fromBulkDevicesResource: exit: items: ${JSON.stringify(items)}`
        );
        return items;
    }

    public toDeviceResource(item: DeviceItem, version: string): DeviceBaseResource {
        logger.silly(
            `device.assembler toDeviceResource: in: item: ${JSON.stringify(
                item
            )}, version:${version}`
        );

        if (item === undefined) {
            logger.silly(`device.assembler toDeviceResource: exit: item: undefined`);
            return undefined;
        }

        let resource: DeviceBaseResource;
        if (version.startsWith('1.')) {
            // v1 specific...
            resource = new Device10Resource();
            const typedResource: Device10Resource = resource;

            // populate version specific device info
            if (item.groups) {
                typedResource.groups = {};
                if (item.groups.in) {
                    Object.keys(item.groups.in).forEach((rel) => {
                        typedResource.groups[rel] = item.groups.in[rel];
                    });
                }
                if (item.groups.out) {
                    Object.keys(item.groups.out).forEach((rel) => {
                        if (typedResource.groups[rel]) {
                            typedResource.groups[rel].push(...item.groups.out[rel]);
                        } else {
                            typedResource.groups[rel] = item.groups.out[rel];
                        }
                    });
                }
            } else {
                delete typedResource.groups;
            }
            if (item.devices) {
                typedResource.devices = {};
                if (item.devices.in) {
                    Object.keys(item.devices.in).forEach((rel) => {
                        typedResource.devices[rel] = item.devices.in[rel];
                    });
                }
                if (item.devices.out) {
                    Object.keys(item.devices.out).forEach((rel) => {
                        if (typedResource.devices[rel]) {
                            typedResource.devices[rel].push(...item.devices.out[rel]);
                        } else {
                            typedResource.devices[rel] = item.devices.out[rel];
                        }
                    });
                }
            } else {
                delete typedResource.devices;
            }
        } else {
            // v2 specific...
            resource = new Device20Resource();
            const typedResource: Device20Resource = resource;

            // populate version specific device info)
            typedResource.groups = item.groups;
            typedResource.devices = item.devices;
        }

        // common properties
        Object.keys(item).forEach((key) => {
            if (key !== 'groups' && key !== 'devices') {
                resource[key] = item[key];
            }
        });

        logger.silly(
            `device.assembler toDeviceResource: exit: resource: ${JSON.stringify(resource)}`
        );
        return resource;
    }

    public toDeviceResourceList(items: DeviceItemList, version: string): DeviceResourceList {
        logger.silly(
            `device.assembler toDeviceResourceList: in: items: ${JSON.stringify(
                items
            )}, version:${version}`
        );

        if (items === undefined) {
            logger.silly(`device.assembler toDeviceResourceList: exit: items: undefined`);
            return undefined;
        }

        const resources = new DeviceResourceList();
        resources.pagination = items.pagination;
        resources.results = [];

        items.results.forEach((item) =>
            resources.results.push(this.toDeviceResource(item, version))
        );

        logger.silly(
            `device.assembler toDeviceResourceList: exit: resources: ${JSON.stringify(resources)}`
        );
        return resources;
    }

    private assembleRelated(model: DeviceItem, related: StringNodeMap, direction: string) {
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
                        model.groups[direction][key].push(
                            (other.attributes['groupPath'] as string[])[0]
                        );
                    } else if (other.category === TypeCategory.Device) {
                        if (model.devices[direction] === undefined) {
                            model.devices[direction] = {};
                        }
                        if (model.devices[direction][key] === undefined) {
                            model.devices[direction][key] = [];
                        }
                        model.devices[direction][key].push(
                            (other.attributes['deviceId'] as string[])[0]
                        );
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
        logger.silly(
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

        logger.silly(`groups.assembler toRelatedDeviceModelsList: exit: r: ${JSON.stringify(r)}`);
        return r;
    }
}
