/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { GroupItem, BulkGroupsResult, GroupMemberItemList, GroupItemList} from './groups.models';
import {logger} from '../utils/logger';
import {TypeCategory} from '../types/constants';
import ow from 'ow';
import { GroupsService } from './groups.service';
import { TYPES } from '../di/types';
import { EventEmitter, Type, Event } from '../events/eventEmitter.service';
import { GroupsAssembler } from './groups.assembler';
import { GroupsDaoLite, ListMembersResponse } from './groups.lite.dao';
import { DeviceItemList } from '../devices/devices.models';

@injectable()
export class GroupsServiceLite implements GroupsService {

    constructor( @inject(TYPES.GroupsDao) private groupsDao: GroupsDaoLite ,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async get(groupId: string): Promise<GroupItem> {
        logger.debug(`groups.lite.service get: in: groupId: ${groupId}`);

        ow(groupId, ow.string.nonEmpty);

        const result  = await this.groupsDao.get(groupId);
        if (result===undefined) {
            throw new Error('NOT_FOUND');
        }

        const model = this.groupsAssembler.toGroupItem(result);
        logger.debug(`groups.lite.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async createBulk(_groups:GroupItem[], _applyProfile?:string) : Promise<BulkGroupsResult> {
        throw new Error('NOT_SUPPORTED');
    }

    public async create(model:GroupItem, applyProfile?:string) : Promise<string> {
        logger.debug(`groups.lite.service create: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.name, ow.string.nonEmpty);
        ow(model.templateId, ow.undefined);
        ow(applyProfile, ow.undefined);

        // remove any non printable characters from the id
        if (model.parentPath) {
            model.parentPath = model.parentPath.replace(/[^\x20-\x7E]+/g, '');
        }
        model.name = model.name.replace(/[^\x20-\x7E]+/g, '');

        // NOTE:  no schema validation supported in lite mode

        // Assemble model into node
        model.category = TypeCategory.Group;
        // As 'lite' mode does not have the concept if hierarchical paths as an indentifier, the group path of a ThingGroup is its name
        model.groupPath = model.name;
        const node = this.groupsAssembler.toNode(model);

        // Save to datastore
        const id = await this.groupsDao.create(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.groupPath,
            type: Type.group,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.lite.service create: exit: id: ${id}`);
        return id;

    }

    public async update(model: GroupItem, applyProfile?:string) : Promise<void> {
        logger.debug(`groups.lite.service update: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.groupPath, ow.string.nonEmpty);
        ow(model.templateId, ow.undefined);
        ow(applyProfile, ow.undefined);

        model.category = TypeCategory.Group;

        // NOTE: schema validation not supported in 'lite' mode

        // as 'lite' only supports updating full resources, we need to fetch the original, then merge thge changes
        const existing = await this.get(model.groupPath);
        if (existing===undefined) {
            throw new Error('NOT_FOUND');
        }
        const merged = Object.assign(new GroupItem(), existing, model);
        merged.attributes = {...existing.attributes, ...model.attributes};

        // Save to datastore
        const node = this.groupsAssembler.toNode(merged);
        await this.groupsDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.groupPath,
            type: Type.group,
            event: Event.modify,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.lite.service update: exit:`);
    }

    public async getMembers(groupPath:string, category:TypeCategory, type:string, state:string, offset?:number|string, maxResults?:number): Promise<GroupMemberItemList> {
        logger.debug(`groups.lite.service getMembers: in: groupPath:${groupPath}, category:${category}, type:${type}, state:${state}, offset:${offset}, maxResults:${maxResults}`);

        ow(groupPath, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);
        ow(type, ow.undefined);
        ow(state, ow.undefined);

        let result:ListMembersResponse;
        if (category===TypeCategory.Device) {
            result  = await this.groupsDao.listDeviceMembers(groupPath, maxResults, <string> offset);
        } else {
            result  = await this.groupsDao.listGroupMembers(groupPath, maxResults, <string> offset);
        }

        const model = this.groupsAssembler.toGroupMembersList(result.nodes, result.nextToken, maxResults);

        logger.debug(`groups.lite.service getMembers: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getParentGroups(groupPath:string): Promise<GroupItem[]> {
        logger.debug(`groups.lite.service getParentGroups: in: groupPath:${groupPath}`);

        ow(groupPath, ow.string.nonEmpty);

        // in 'lite' mode we have to recurse manually
        const groups:GroupItem[]=[];
        let group = await this.get(groupPath);
        groups.push(group);
        while (group.parentPath!==undefined) {
            group = await this.get(group.parentPath);
            groups.push(group);
        }

        logger.debug(`groups.lite.service getParentGroups: exit: model: ${JSON.stringify(groups)}`);
        return groups;
    }

    public async delete(groupPath: string) : Promise<void> {
        logger.debug(`groups.lite.service delete: in: groupPath: ${groupPath}`);

        ow(groupPath, ow.string.nonEmpty);

        const model = await this.get(groupPath);
        if (model===undefined) {
            throw new Error('NOT_FOUND');
        }

        // Save to datastore
        model.category = TypeCategory.Group;
        await this.groupsDao.delete(groupPath, model.version);

        // fire event
        await this.eventEmitter.fire({
            objectId: groupPath,
            type: Type.group,
            event: Event.delete,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.lite.service delete: exit:`);
    }

    public async attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.lite.service attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.lite.service detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async listRelatedGroups(groupPath: string, relationship: string, direction:string, template:string, offset:number, count:number) : Promise<GroupItemList> {
        logger.debug(`groups.full.service listRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async listRelatedDevices(groupPath: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number) : Promise<DeviceItemList> {
        logger.debug(`groups.full.service listRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async attachToDevice(_groupPath:string, _relationship:string, _otherDeviceId:string) {
        throw new Error('NOT_SUPPORTED');
    }

    public async detachFromDevice(_groupPath:string, _relationship:string, _otherDeviceId:string) {
        throw new Error('NOT_SUPPORTED');
    }
}
