/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TypeCategory} from '../types/constants';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { ProfileNode, DeviceProfileItem, GroupProfileItem, DeviceProfile10Resource, DeviceProfile20Resource, GroupProfile10Resource, GroupProfile20Resource, DeviceProfileResource, GroupProfileResource, ProfileItemList, ProfileResourceList } from './profiles.models';
import { GroupItem } from '../groups/groups.models';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceItem } from '../devices/devices.models';

@injectable()
export class ProfilesAssembler {

    constructor(
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    public toNode(model:DeviceProfileItem|GroupProfileItem): ProfileNode {
        logger.debug(`profiles.assembler toNode: in: model:${JSON.stringify(model)}`);

        let node:ProfileNode;

        // first use the device/group assemblers to assemble their specific data
        if (model.category===TypeCategory.Device) {
            node = this.devicesAssembler.toNode(model as DeviceItem);
        } else if (model.category===TypeCategory.Group) {
            node = this.groupsAssembler.toNode(model as GroupItem);
        }

        // then add the attributes which are specific to profile nodes
        node.attributes['profileId'] = model.profileId;
        delete node.attributes['deviceId'];
        delete node.attributes['groupPath'];
        node.types = node.types.filter(t=> t!==TypeCategory.Device && t!==TypeCategory.Group);
        node.types.push(TypeCategory.Profile);
        node.templateId = model.templateId;
        node.groups = model.groups;

        logger.debug(`profiles.assembler toNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public toItem(node: ProfileNode): DeviceProfileItem|GroupProfileItem {
        logger.debug(`profiles.assembler toItem: in: node: ${JSON.stringify(node)}`);

        if (node===undefined) {
            logger.debug(`profiles.assembler toItem: exit: model: undefined`);
            return undefined;
        }

        // first use the device/group assemblers to assemble their specific data
        let model:DeviceProfileItem|GroupProfileItem;
        if (node.category===TypeCategory.Device) {
            model = this.devicesAssembler.toDeviceItem(node) as DeviceProfileItem;
        } else if (node.category===TypeCategory.Group) {
            model = this.groupsAssembler.toGroupItem(node) as GroupProfileItem;
        }

        // then add the attributes which are specific to profile models
        model.profileId = model.attributes['profileId'] as string;
        delete model.attributes['profileId'];
        const groups = model.attributes['groups'] as string;
        if (groups) {
            model.groups = JSON.parse(groups);
            delete model.attributes['groups'];
        } else {
            delete model.groups;
        }

        logger.debug(`profiles.assembler toItem: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    public fromDeviceProfileResource(res: DeviceProfile10Resource|DeviceProfile20Resource): DeviceProfileItem {
        logger.debug(`profiles.assembler fromDeviceProfileResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`profiles.assembler fromDeviceProfileResource: exit: res: undefined`);
            return undefined;
        }

        const item:DeviceProfileItem = this.devicesAssembler.fromDeviceResource(res) as DeviceProfileItem;

        // then add the attributes which are specific to profile models
        item.profileId = res.profileId;
        const groups = res.attributes['groups'] as string;
        if (groups) {
            item.groups = JSON.parse(groups);
        }

        logger.debug(`profiles.assembler fromDeviceProfileResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toDeviceProfileResource(item: DeviceProfileItem, version:string): DeviceProfileResource {
        logger.debug(`profiles.assembler toDeviceProfileResource: in: item: ${JSON.stringify(item)}, version:${version}`);

        if (item===undefined) {
            logger.debug(`profiles.assembler toDeviceProfileResource: exit: res: undefined`);
            return undefined;
        }

        const resource = this.devicesAssembler.toDeviceResource(item as DeviceItem, version) as DeviceProfileResource;

        // then add the attributes which are specific to profile models
        resource.profileId = item.profileId;

        if (version.startsWith('1.0')) {
            if (item.groups!==undefined) {
                (resource as DeviceProfile10Resource).groups = {};
                Object.keys(item.groups).forEach(direction=> {
                    Object.keys(item.groups[direction]).forEach(relation=> {
                        (resource as DeviceProfile10Resource).groups[relation] = item.groups[direction][relation];
                    });
                });
            }
        } else {
            (resource as DeviceProfile20Resource).groups = item.groups;
        }

        logger.debug(`profiles.assembler toDeviceProfileResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public fromGroupProfileResource(res: GroupProfile10Resource|GroupProfile20Resource): GroupProfileItem {
        logger.debug(`profiles.assembler fromGroupProfileResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`profiles.assembler fromGroupProfileResource: exit: res: undefined`);
            return undefined;
        }

        const item:GroupProfileItem = this.groupsAssembler.fromGroupResource(res) as GroupProfileItem;

        // then add the attributes which are specific to profile models
        item.profileId = res.profileId;
        const groups = res.attributes['groups'] as string;
        if (groups) {
            item.groups = JSON.parse(groups);
        }

        logger.debug(`profiles.assembler fromGroupProfileResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toGroupProfileResource(item: GroupProfileItem, version:string): GroupProfileResource {
        logger.debug(`profiles.assembler toGroupProfileResource: in: item: ${JSON.stringify(item)}, version:${version}`);

        if (item===undefined) {
            logger.debug(`profiles.assembler toGroupProfileResource: exit: res: undefined`);
            return undefined;
        }

        const resource = this.groupsAssembler.toGroupResource(item as GroupItem, version) as GroupProfileResource;

        // then add the attributes which are specific to profile models
        resource.profileId = item.profileId;

        if (version.startsWith('1.0')) {
            if (item.groups!==undefined) {
                (resource as GroupProfile10Resource).groups = {};
                Object.keys(item.groups).forEach(direction=> {
                    Object.keys(item.groups[direction]).forEach(relation=> {
                        (resource as GroupProfile10Resource).groups[relation] = item.groups[direction][relation];
                    });
                });
            }
        } else {
            (resource as GroupProfile20Resource).groups = item.groups;
        }

        logger.debug(`profiles.assembler toGroupProfileResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items: ProfileItemList, version:string): (ProfileResourceList) {
        logger.debug(`profiles.assembler toResourceList: in: items: ${JSON.stringify(items)}, version:${version}`);

        if (items===undefined) {
            logger.debug(`profiles.assembler toResourceList: exit: items: undefined`);
            return undefined;
        }

        const resources = new ProfileResourceList();
        resources.pagination = items.pagination;

        items.results.forEach(item=> {
            if (item.category==='device') {
                resources.results.push(this.toDeviceProfileResource(item as DeviceProfileItem, version));
            } else if (item.attributes.category==='group') {
                resources.results.push(this.toGroupProfileResource(item as GroupProfileItem, version));
            }
        });

        logger.debug(`profiles.assembler toResourceList: exit: resources: ${JSON.stringify(resources)}`);
        return resources;

    }

    public toItemList(nodes:ProfileNode[]): ProfileItemList {
        logger.debug(`profiles.assembler toItemList: in: nodes:${JSON.stringify(nodes)}`);

        if (nodes===undefined || nodes.length===0) {
            logger.debug(`profiles.assembler toItemList: exit: model: undefined`);
            return undefined;
        }

        const model = new ProfileItemList();
        for(const n of nodes) {
            model.results.push(this.toItem(n));
        }

        logger.debug(`profiles.assembler toItemList: exit: model: ${JSON.stringify(model)}`);
        return model;

    }
}
