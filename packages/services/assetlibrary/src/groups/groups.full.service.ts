/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { GroupModel, BulkLoadGroupsRequest, BulkLoadGroupsResult, GroupsMembersModel, RelatedGroupListModel} from './groups.models';
import { GroupsAssembler} from './groups.assembler';
import { TYPES } from '../di/types';
import { GroupsDaoFull } from './groups.full.dao';
import {logger} from '../utils/logger';
import {TypesService} from '../types/types.service';
import {TypeCategory, Operation} from '../types/constants';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import ow from 'ow';
import { GroupProfileModel } from '../profiles/profiles.models';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from './groups.service';
import { DevicesAssembler } from '../devices/devices.assembler';
import { RelatedDeviceListResult } from '../devices/devices.models';

@injectable()
export class GroupsServiceFull implements GroupsService {

    constructor( @inject(TYPES.GroupsDao) private groupsDao: GroupsDaoFull ,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async get(groupPath: string): Promise<GroupModel> {
        logger.debug(`groups.full.service get: in: groupPath: ${groupPath}`);

        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath = groupPath.toLowerCase();

        const result  = await this.groupsDao.get(groupPath);
        if (result===undefined) {
            throw new Error('NOT_FOUND');
        }

        const model = this.groupsAssembler.toGroupModel(result);
        logger.debug(`groups.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async createBulk(request:BulkLoadGroupsRequest, applyProfile?:string) : Promise<BulkLoadGroupsResult> {
        logger.debug(`groups.full.service createBulk: in: request: ${JSON.stringify(request)}, applyProfile:${applyProfile}`);

        ow(request, ow.object.nonEmpty);
        ow(request.groups, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const group of request.groups) {
            try {
                await this.create(group, applyProfile);
                success++;
            } catch (err) {
                errors[group.groupPath] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors
        };

        logger.debug(`groups.full.service createBulk: exit: response: ${response}`);
        return response;
    }

    private setIdsToLowercase(model:GroupModel) {
        if (model.groupPath) {
            model.groupPath = model.groupPath.toLowerCase();
        }
        if (model.templateId) {
            model.templateId = model.templateId.toLowerCase();
        }
        if (model.parentPath) {
            model.parentPath = model.parentPath.toLowerCase();
        }
    }

    public  async ___test___applyProfile(model: GroupModel, applyProfile?:string) : Promise<GroupModel> {
        return this.applyProfile(model, applyProfile);
    }

    private async applyProfile(model: GroupModel, applyProfile?:string) : Promise<GroupModel> {
        logger.debug(`groups.full.service applyProfile: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        // retrieve profile
        const profile = await this.profilesService.get(model.templateId, applyProfile) as GroupProfileModel;
        if (profile===undefined) {
            throw new Error('INVALID_PROFILE');
        }

        // apply profile to unset attributes
        if (profile.attributes===undefined) {
            profile.attributes= {};
        }
        if (model.attributes===undefined) {
            model.attributes= {};
        }
        const {profileId, ...groupProfileAttributes} = profile;
        const mergedModel = {...groupProfileAttributes, ...model};
        const mergedAttributes = {...profile.attributes, ...model.attributes};
        const mergedGroups = {...profile.groups, ...model.groups};
        mergedModel.attributes = mergedAttributes;
        mergedModel.groups = mergedGroups;

        logger.debug(`groups.full.service applyProfile: exit:${JSON.stringify(mergedModel)}`);

        return mergedModel;

    }

    public async create(model:GroupModel, applyProfile?:string) : Promise<string> {
        logger.debug(`groups.full.service create: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.name, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            model = await this.applyProfile(model, applyProfile);
        }

        // remove any non printable characters from the id
        model.parentPath = model.parentPath.replace(/[^\x20-\x7E]+/g, '');
        model.name = model.name.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        // schema validation
        const validateSubTypeFuture = await this.typesService.validateSubType(model.templateId, TypeCategory.Group, model, Operation.CREATE);
        const validateRelationshipsFuture = this.typesService.validateRelationshipsByPath(model.templateId, model.groups);
        const results = await Promise.all([validateSubTypeFuture, validateRelationshipsFuture]);

        // schema validation results
        const subTypeValidation = results[0];
        if (!subTypeValidation.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // validate the path associations
        const relationshipsValidation=results[1];
        if (!relationshipsValidation)  {
            throw new Error('INVALID_RELATION');
        }

        // ensure parent exists
        const parent = await this.get(model.parentPath);
        if (parent===undefined) {
            throw new Error ('INVALID_PARENT');
        }

        model.groupPath = (model.parentPath==='/') ?
            '/' + model.name.toLowerCase() :
            `${model.parentPath}/${model.name.toLowerCase()}`;

        // Assemble devicemodel into node
        model.category = TypeCategory.Group;
        const node = this.groupsAssembler.toNode(model);

        // Save to datastore
        const id = await this.groupsDao.create(node, model.groups);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.groupPath,
            type: Type.group,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.full.service create: exit: id: ${id}`);
        return id;

    }

    public async update(model: GroupModel, applyProfile?:string) : Promise<void> {
        logger.debug(`groups.full.service update: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.groupPath, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            const existing = await this.get(model.groupPath);
            if (existing===undefined) {
                throw new Error('NOT_FOUND');
            }
            const merged = {...existing, ...model};
            model = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        const labels = await this.groupsDao.getLabels(model.groupPath);
        const templateId = labels.filter(l=> l!=='group')[0];

        // schema validation
        const validate = await this.typesService.validateSubType(templateId, TypeCategory.Group, model, Operation.UPDATE);
        if (!validate.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        model.category = TypeCategory.Group;
        model.templateId = templateId;
        const node = this.groupsAssembler.toNode(model);

        // Save to datastore
        await this.groupsDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.groupPath,
            type: Type.group,
            event: Event.modify,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.full.service update: exit:`);

    }

    public async getMembers(groupPath:string, category:TypeCategory, type:string, state:string, offset?:number, count?:number): Promise<GroupsMembersModel> {
        logger.debug(`groups.full.service getMembers: in: groupPath:${groupPath}, category:${category}, type:${type}, state:${state}, offset:${offset}, count:${count}`);

        ow(groupPath, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();
        if (type) {
            type=type.toLowerCase();
        } else {
            type=category;
        }

        // state filter only applies to devices, and has a default of `active` if not provided
        let filterRelatedBy;
        if (category===TypeCategory.Device) {
            state = (state===undefined || state===null)? 'active' : state;
            filterRelatedBy = {
                state
            };
        }

        const result  = await this.groupsDao.listRelated(groupPath, '*', 'in', type, filterRelatedBy, offset, count);

        if (offset!==undefined && count!==undefined) {
            offset+=count;
        }
        let model:GroupsMembersModel;
        if (category===TypeCategory.Group) {
            model = this.groupsAssembler.toRelatedGroupModelsList(result);
        } else {
            model = this.devicesAssembler.toRelatedDeviceModelsList(result);
        }
        logger.debug(`groups.full.service getMembers: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getParentGroups(groupPath:string): Promise<GroupModel[]> {
        logger.debug(`groups.full.service getParentGroups: in: groupPath:${groupPath}`);

        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();

        const result  = await this.groupsDao.listParentGroups(groupPath);

        const model = this.groupsAssembler.toGroupModelList(result);
        logger.debug(`groups.full.service getParentGroups: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async delete(groupPath: string) : Promise<void> {
        logger.debug(`groups.full.service delete: in: groupPath: ${groupPath}`);

        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();

        const model = await this.get(groupPath);
        if (model===undefined) {
            throw new Error('NOT_FOUND');
        }

        // Save to datastore
        model.category = TypeCategory.Group;
        await this.groupsDao.delete(groupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: groupPath,
            type: Type.group,
            event: Event.delete,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.full.service delete: exit:`);

    }

    public async attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.service attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        sourceGroupPath = sourceGroupPath.toLowerCase();
        relationship = relationship.toLowerCase();
        targetGroupPath = targetGroupPath.toLowerCase();

        // const sourceGroupFuture = this.get(sourceGroupPath);
        // const targetGroupFuture = this.get(targetGroupPath);
        // const results = await Promise.all([sourceGroupFuture, targetGroupFuture]);
        const sourceGroup = await this.get(sourceGroupPath);

        const out: {[key:string]:string[]} = {};
        // out[relationship] = [ results[1].templateId ];
        out[relationship] = [targetGroupPath];

        // const isValid = await this.typesService.validateRelationshipsByPath(results[0].templateId, out);
        const isValid = await this.typesService.validateRelationshipsByPath(sourceGroup.templateId, out);
        if (!isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Save to datastore
        await this.groupsDao.attachToGroup(sourceGroupPath, relationship, targetGroupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: sourceGroupPath,
            type: Type.group,
            event: Event.modify,
            attributes: {
                sourceGroupPath,
                attachedToGroup: targetGroupPath,
                relationship
            }
        });

        logger.debug(`groups.full.service attachToGroup: exit:`);
    }

    public async detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> {
        logger.debug(`groups.full.service detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);

        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        sourceGroupPath = sourceGroupPath.toLowerCase();
        relationship = relationship.toLowerCase();
        targetGroupPath = targetGroupPath.toLowerCase();

        // Save to datastore
        await this.groupsDao.detachFromGroup(sourceGroupPath, relationship, targetGroupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: sourceGroupPath,
            type: Type.group,
            event: Event.modify,
            attributes: {
                sourceGroupPath,
                detachedFromGroup: targetGroupPath,
                relationship
            }
        });

        logger.debug(`groups.full.service detachFromGroup: exit:`);
    }

    public async listRelatedGroups(groupPath: string, relationship: string, direction:string, template:string, offset:number, count:number) : Promise<RelatedGroupListModel> {
        logger.debug(`groups.full.service listRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);

        ow(groupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);

        // defaults
        if (direction===undefined || direction===null) {
            direction = 'both';
        }
        if (template===undefined || template===null) {
            template=TypeCategory.Group;
        }

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();
        relationship=relationship.toLowerCase();
        if (template) {
            template=template.toLowerCase();
        }
        direction=direction.toLowerCase();

        const result  = await this.groupsDao.listRelated(groupPath, relationship, direction, template, undefined, offset, count);

        if (offset!==undefined && count!==undefined) {
            offset+=count;
        }
        const model = this.groupsAssembler.toRelatedGroupModelsList(result);
        logger.debug(`groups.full.service listRelatedGroups: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async listRelatedDevices(groupPath: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number) : Promise<RelatedDeviceListResult> {
        logger.debug(`groups.full.service listRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

        ow(groupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);

        // defaults
        if (direction===undefined || direction===null) {
            direction = 'both';
        }
        if (state===undefined || state===null) {
            state = 'active';
        }
        if (template===undefined || template===null) {
            template=TypeCategory.Device;
        }

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();
        relationship=relationship.toLowerCase();
        if (template) {
            template=template.toLowerCase();
        }
        if (state) {
            state=state.toLowerCase();
        }
        direction=direction.toLowerCase();

        const result  = await this.groupsDao.listRelated(groupPath, relationship, direction, template, {state}, offset, count);

        if (offset!==undefined && count!==undefined) {
            offset+=count;
        }
        const model = this.devicesAssembler.toRelatedDeviceModelsList(result);
        logger.debug(`groups.full.service listRelatedDevices: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

}
