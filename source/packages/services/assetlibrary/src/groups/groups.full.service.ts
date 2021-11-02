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
import { injectable, inject } from 'inversify';
import { GroupItem, BulkGroupsResult, GroupMemberItemList, GroupItemList} from './groups.models';
import { GroupsAssembler} from './groups.assembler';
import { TYPES } from '../di/types';
import { GroupsDaoFull } from './groups.full.dao';
import {logger} from '../utils/logger';
import {TypesService} from '../types/types.service';
import {TypeCategory, Operation} from '../types/constants';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import ow from 'ow';
import { GroupProfileItem } from '../profiles/profiles.models';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupsService } from './groups.service';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceItemList } from '../devices/devices.models';
import { StringToArrayMap, DirectionStringToArrayMap, SortKeys } from '../data/model';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { ClaimAccess } from '../authz/claims';
import { TypeUtils } from '../utils/typeUtils';

@injectable()
export class GroupsServiceFull implements GroupsService {

    constructor(
        @inject('defaults.groups.validateAllowedParentPaths') private validateAllowedParentPaths: boolean,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDaoFull ,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.AuthzServiceFull) private authServiceFull: AuthzServiceFull,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async get(groupPath: string, includeGroups?: boolean): Promise<GroupItem> {
        logger.debug(`groups.full.service get: in: groupPath: ${groupPath}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);

        if (includeGroups===undefined) {
            includeGroups = true;
        }

        // any ids need to be lowercase
        groupPath = groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.R);

        const result = await this.groupsDao.get([groupPath], includeGroups);
        let model:GroupItem;
        if (result!==undefined && result.length > 0) {
            model = this.groupsAssembler.toGroupItem(result[0]);
        }
        logger.debug(`groups.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getBulk(groupPaths:string[]): Promise<GroupItemList> {
        logger.debug(`groups.full.service: getBulk: in: groupPaths: ${groupPaths}`);

        ow(groupPaths, ow.array.nonEmpty);

        groupPaths = groupPaths.map(g=> g.toLowerCase());

        await this.authServiceFull.authorizationCheck(groupPaths, [], ClaimAccess.R);

        const result = await this.groupsDao.get(groupPaths);

        const model = this.groupsAssembler.toGroupItems(result);
        logger.debug(`groups.full.service get: exit: model: ${JSON.stringify(model)}`);
        return {results:model};
    }
    public async createBulk(groups:GroupItem[], applyProfile?:string) : Promise<BulkGroupsResult> {
        logger.debug(`groups.full.service createBulk: in: groups: ${JSON.stringify(groups)}, applyProfile:${applyProfile}`);

        ow(groups, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const group of groups) {
            try {
                await this.create(group, applyProfile);
                success++;
            } catch (err) {
                //errors[group.groupPath] = err;
                errors[`${group.parentPath}/${group.name}`] = err;
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

    private setIdsToLowercase(model:GroupItem) {
        logger.debug(`groups.full.service setIdsToLowercase: in:`);
         
        if (model.groupPath) {
            model.groupPath = model.groupPath.toLowerCase();
        }
        if (model.templateId) {
            model.templateId = model.templateId.toLowerCase();
        }
        if (model.parentPath) {
            model.parentPath = model.parentPath.toLowerCase();
        }
        if (model.groups) {
            if (model.groups.in) {
                /* lowerrcasting values */
                Object.keys(model.groups.in).forEach(k=> {
                    model.groups.in[k] = model.groups.in[k].map(p => {
                        if (p===undefined) {
                            return p;
                        } else {
                            return p.toLowerCase();
                        }
                    });
                });
                /* lowercasting keys */
                model.groups.in = Object.fromEntries(
                    Object.entries(model.groups.in).map(([k,v]) => [k.toLowerCase(),v])
                );
            }
            if (model.groups.out) {
                 /* lowerrcasting values */
                Object.keys(model.groups.out).forEach(k=> {
                    model.groups.out[k] = model.groups.out[k].map(p => {
                        if (p===undefined) {
                            return p;
                        } else {
                            return p.toLowerCase();
                        }
                    });
                });
                /* lowercasting keys */
                model.groups.out = Object.fromEntries(
                    Object.entries(model.groups.out).map(([k,v]) => [k.toLowerCase(),v])
                );
            }
        }
        logger.debug(`groups.full.service setIdsToLowercase: exit:`);
    }

    public  async ___test___applyProfile(model: GroupItem, applyProfile?:string) : Promise<GroupItem> {
        return this.applyProfile(model, applyProfile);
    }

    private async applyProfile(model: GroupItem, applyProfile?:string) : Promise<GroupItem> {
        logger.debug(`groups.full.service applyProfile: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        // retrieve profile
        const profile = await this.profilesService.get(model.templateId, applyProfile) as GroupProfileItem;
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
        if (profile.groups===undefined) {
            profile.groups= {};
        }
        if (model.groups===undefined) {
            model.groups= {};
        }
        const {profileId, ...groupProfileAttributes} = profile;
        const mergedModel = Object.assign(new GroupItem(), groupProfileAttributes, model);
        const mergedAttributes = {...profile.attributes, ...model.attributes};
        const mergedGroupsIn = {...profile.groups.in, ...model.groups.in};
        const mergedGroupsOut = {...profile.groups.out, ...model.groups.out};
        mergedModel.attributes = mergedAttributes;
        mergedModel.groups = {
            in: mergedGroupsIn,
            out: mergedGroupsOut
        };

        if (Object.keys(mergedModel.groups.in).length===0) {
            delete mergedModel.groups.in;
        }
        if (Object.keys(mergedModel.groups.out).length===0) {
            delete mergedModel.groups.out;
        }
        if (Object.keys(mergedModel.groups).length===0) {
            delete mergedModel.groups;
        }
        if (Object.keys(mergedModel.attributes).length===0) {
            delete mergedModel.attributes;
        }

        logger.debug(`groups.full.service applyProfile: exit:${JSON.stringify(mergedModel)}`);

        return mergedModel;

    }

    public async create(model:GroupItem, applyProfile?:string) : Promise<string> {
        logger.debug(`groups.full.service create: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.name, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            model = await this.applyProfile(model, applyProfile);
        }

        // remove any non printable characters from the id
        model.name = model.name.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        await this.authServiceFull.authorizationCheck([], [model.parentPath, ...model.listRelatedGroupPaths()], ClaimAccess.C);

        // schema validation
        const validateSubTypeFuture = this.typesService.validateSubType(model.templateId, TypeCategory.Group, model, Operation.CREATE);
        // if configured so, validate the parent path relations too (default is allow any parent path relationship)
        const relsToValidate:DirectionStringToArrayMap = Object.assign({}, model.groups);
        if (this.validateAllowedParentPaths) {
            if (relsToValidate.out===undefined) {
                relsToValidate.out= {};
            }
            relsToValidate.out.parent = [model.parentPath];
        }
        const validateRelationshipsFuture = this.typesService.validateRelationshipsByPath(model.templateId, relsToValidate);
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

        // Assemble item into node
        model.category = TypeCategory.Group;
        const node = this.groupsAssembler.toNode(model);

        // Save to datastore
        await this.groupsDao.create(node, model.groups);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.groupPath,
            type: Type.group,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        logger.debug(`groups.full.service create: exit: ${model.groupPath}`);
        return model.groupPath;

    }

    public async update(model: GroupItem, applyProfile?:string) : Promise<void> {
        logger.debug(`groups.full.service update: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.groupPath, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            const existing = await this.get(model.groupPath);
            if (existing===undefined) {
                throw new Error('NOT_FOUND');
            }
            const merged = Object.assign(new GroupItem(), existing, model);
            model = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        await this.authServiceFull.authorizationCheck([], [model.groupPath, ...model.listRelatedGroupPaths()], ClaimAccess.U);

        const labels = await this.groupsDao.getLabels(model.groupPath);
        if (labels===undefined) {
            throw new Error('NOT_FOUND');
        }
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

    public async getMembers(groupPath:string, category:TypeCategory, type:string, state:string, offset?:number, count?:number, sort?:SortKeys): Promise<GroupMemberItemList> {
        logger.debug(`groups.full.service getMembers: in: groupPath:${groupPath}, category:${category}, type:${type}, state:${state}, offset:${offset}, count:${count}, sort:${JSON.stringify(sort)}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);
        ow(category,'category', ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();
        if (type) {
            type=type.toLowerCase();
        } else {
            type=category;
        }

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = this.typeUtils.parseInt(offset);
        const countAsInt = this.typeUtils.parseInt(count);

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.R);

        // state filter only applies to devices, and has a default of `active` if not provided
        let filterRelatedBy;
        if (category===TypeCategory.Device) {
            state = (state===undefined || state===null)? 'active' : state;
            filterRelatedBy = {
                state
            };
        }

        const result  = await this.groupsDao.listRelated(groupPath, '*', 'in', type, filterRelatedBy, offsetAsInt, countAsInt, sort);

        let model:GroupMemberItemList;
        if (category===TypeCategory.Group) {
            model = this.groupsAssembler.toRelatedGroupItemList(result, offsetAsInt, countAsInt);
        } else {
            model = this.devicesAssembler.toRelatedDeviceModelsList(result, offsetAsInt, countAsInt);
        }
        logger.debug(`groups.full.service getMembers: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getParentGroups(groupPath:string): Promise<GroupItem[]> {
        logger.debug(`groups.full.service getParentGroups: in: groupPath:${groupPath}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.R);

        const result  = await this.groupsDao.listParentGroups(groupPath);

        const model = this.groupsAssembler.toGroupItemList(result);
        logger.debug(`groups.full.service getParentGroups: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async delete(groupPath: string) : Promise<void> {
        logger.debug(`groups.full.service delete: in: groupPath: ${groupPath}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);

        // any ids need to be lowercase
        groupPath=groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.D);

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

        ow(sourceGroupPath, 'sourceGroupPath',ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath',ow.string.nonEmpty);

        // any ids need to be lowercase
        sourceGroupPath = sourceGroupPath.toLowerCase();
        relationship = relationship.toLowerCase();
        targetGroupPath = targetGroupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([], [sourceGroupPath, targetGroupPath], ClaimAccess.U);

        const sourceGroup = await this.get(sourceGroupPath);

        const out: StringToArrayMap = {};
        out[relationship] = [targetGroupPath];

        const isValid = await this.typesService.validateRelationshipsByPath(sourceGroup.templateId, {out});
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

        ow(sourceGroupPath, 'sourceGroupPath',ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath',ow.string.nonEmpty);

        // any ids need to be lowercase
        sourceGroupPath = sourceGroupPath.toLowerCase();
        relationship = relationship.toLowerCase();
        targetGroupPath = targetGroupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([], [sourceGroupPath, targetGroupPath], ClaimAccess.U);

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

    public async listRelatedGroups(groupPath: string, relationship: string, direction:string, template:string, offset:number, count:number, sort:SortKeys) : Promise<GroupItemList> {
        logger.debug(`groups.full.service listRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}, sort:${JSON.stringify(sort)}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);

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

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = this.typeUtils.parseInt(offset);
        const countAsInt = this.typeUtils.parseInt(count);

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.R);

        const result  = await this.groupsDao.listRelated(groupPath, relationship, direction, template, undefined, offsetAsInt, countAsInt, sort);

        const model = this.groupsAssembler.toRelatedGroupItemList(result, offsetAsInt, countAsInt);
        logger.debug(`groups.full.service listRelatedGroups: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async listRelatedDevices(groupPath: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number, sort:SortKeys) : Promise<DeviceItemList> {
        logger.debug(`groups.full.service listRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}, sort:${JSON.stringify(sort)}`);

        ow(groupPath,'groupPath', ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);

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

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = this.typeUtils.parseInt(offset);
        const countAsInt = this.typeUtils.parseInt(count);

        await this.authServiceFull.authorizationCheck([], [groupPath], ClaimAccess.R);

        const result  = await this.groupsDao.listRelated(groupPath, relationship, direction, template, {state}, offsetAsInt, countAsInt, sort);

        const model = this.devicesAssembler.toRelatedDeviceModelsList(result, offsetAsInt, countAsInt);
        logger.debug(`groups.full.service listRelatedDevices: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

}
