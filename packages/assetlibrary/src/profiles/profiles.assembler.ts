/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TypeCategory} from '../types/constants';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { ProfileNode, DeviceProfileModel, GroupProfileModel, ProfileModelList } from './profiles.models';
import { GroupModel } from '../groups/groups.models';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceModel } from '../devices/devices.models';

@injectable()
export class ProfilesAssembler {

    constructor(
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    public toNode(model:DeviceProfileModel|GroupProfileModel): ProfileNode {
        logger.debug(`profiles.assembler toNode: in: model:${JSON.stringify(model)}`);

        let node:ProfileNode;

        // first use the device/group assemblers to assemble their specific data
        if (model.category===TypeCategory.Device) {
            node = this.devicesAssembler.toNode(model as DeviceModel);
        } else if (model.category===TypeCategory.Group) {
            node = this.groupsAssembler.toNode(model as GroupModel);
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

    public toModel(node: ProfileNode): DeviceProfileModel|GroupProfileModel {
        logger.debug(`profiles.assembler toModel: in: node: ${JSON.stringify(node)}`);

        if (node===undefined) {
            logger.debug(`profiles.assembler toModel: exit: model: undefined`);
            return undefined;
        }

        // first use the device/group assemblers to assemble their specific data
        let model:DeviceProfileModel|GroupProfileModel;
        if (node.category===TypeCategory.Device) {
            model = this.devicesAssembler.toDeviceModel(node) as DeviceProfileModel;
        } else if (node.category===TypeCategory.Group) {
            model = this.groupsAssembler.toGroupModel(node) as GroupProfileModel;
        }

        // then add the attributes which are specific to profile models
        model.profileId = model.attributes['profileId'] as string;
        delete model.attributes['profileId'];
        const groups = model.attributes['groups'] as string;
        if (groups) {
            model.groups = JSON.parse(groups);
            delete model.attributes['groups'];
        }

        logger.debug(`profiles.assembler toModel: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    public toModelList(nodes:ProfileNode[]): ProfileModelList {
        logger.debug(`profiles.assembler toModelList: in: nodes:${JSON.stringify(nodes)}`);

        if (nodes===undefined || nodes.length===0) {
            logger.debug(`profiles.assembler toModelList: exit: model: undefined`);
            return undefined;
        }

        const model = new ProfileModelList();
        for(const n of nodes) {
            model.results.push(this.toModel(n));
        }

        logger.debug(`profiles.assembler toModelList: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

}
