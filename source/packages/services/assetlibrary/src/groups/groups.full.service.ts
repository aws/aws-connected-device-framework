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
import { SortKeys, DirectionToRelatedEntityArrayMap, RelatedEntityArrayMap } from '../data/model';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { ClaimAccess } from '../authz/claims';
import { TypeUtils } from '../utils/typeUtils';
import { TypeDefinitionStatus } from '../types/types.models';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';

@injectable()
export class GroupsServiceFull implements GroupsService {

    constructor(
        @inject('authorization.enabled') private isAuthzEnabled: boolean,
        @inject('defaults.groups.validateAllowedParentPaths') private validateAllowedParentPaths: boolean,
        @inject(TYPES.AuthzServiceFull) private authServiceFull: AuthzServiceFull,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDaoFull ,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils) {

        }

    public async get(groupPath: string, includeGroups: boolean): Promise<GroupItem> {
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

    public async getBulk(groupPaths:string[], includeGroups:boolean): Promise<GroupItemList> {
        logger.debug(`groups.full.service: getBulk: in: groupPaths: ${groupPaths}, includeGroups:${includeGroups}`);

        ow(groupPaths, ow.array.nonEmpty);

        groupPaths = groupPaths.map(g=> g.toLowerCase());

        await this.authServiceFull.authorizationCheck(groupPaths, [], ClaimAccess.R);

        const result = await this.groupsDao.get(groupPaths, includeGroups);

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
        logger.debug(`groups.full.service setIdsToLowercase: in: ${JSON.stringify(model)}`);
         
        if (model.groupPath) {
            model.groupPath = model.groupPath.toLowerCase();
        }
        if (model.templateId) {
            model.templateId = model.templateId.toLowerCase();
        }
        if (model.parentPath) {
            model.parentPath = model.parentPath.toLowerCase();
        }

        const relatedIdToLowercase = (rels: RelatedEntityArrayMap) => {
            /* lowercasting values */
            Object.values(rels).forEach(entities=> {
                entities.forEach(entity=> entity.id = entity.id.toLowerCase());
            });
            /* lowercasting keys */
            rels = Object.fromEntries(
                Object.entries(rels).map(([k,v]) => [k.toLowerCase(),v]));
            return rels;
        };
        if (model.groups?.in) {
            model.groups.in = relatedIdToLowercase(model.groups.in);
        }
        if (model.groups?.out) {
            model.groups.out = relatedIdToLowercase(model.groups.out);
        }

        logger.debug(`groups.full.service setIdsToLowercase: model: ${JSON.stringify(model)}`);
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

    public async create(group:GroupItem, applyProfile?:string) : Promise<string> {
        logger.debug(`groups.full.service create: in: model:${JSON.stringify(group)}, applyProfile:${applyProfile}`);

        ow(group, ow.object.nonEmpty);
        ow(group.templateId, ow.string.nonEmpty);
        ow(group.name, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            group = await this.applyProfile(group, applyProfile);
        }

        // remove any non printable characters from the id
        group.name = group.name.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(group);

        await this.authServiceFull.authorizationCheck([], [group.parentPath, ...group.listRelatedGroupPaths()], ClaimAccess.C);

        // perform validation of the group...
        const template = await this.typesService.get(group.templateId, TypeCategory.Group, TypeDefinitionStatus.published);
        if (template===undefined) {
            throw new Error ('INVALID_TEMPLATE');
        }
        const validateSubTypeFuture = this.validator.validateSubType(template, group, Operation.CREATE);
        const relations:DirectionToRelatedEntityArrayMap = Object.assign({}, group.groups);
        if (this.validateAllowedParentPaths) {
            if (relations.out===undefined) {
                relations.out= {};
            }
            relations.out.parent = [{id:group.parentPath}];
        }
        const validateRelationshipsFuture = this.validator.validateRelationshipsByIds(template, relations, undefined);
        const [subTypeValidation,validateRelationships] = await Promise.all([validateSubTypeFuture, validateRelationshipsFuture]);

        // schema validation results
        if (!subTypeValidation.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // validate the id associations
        if (!validateRelationships.isValid)  {
            throw new Error('INVALID_RELATION');
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        if (this.isAuthzEnabled) {
            const incomingAuthRelations = template.schema.relations.incomingAuthRelations();
            const outgoingAuthRelations = template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(group.groups?.in, incomingAuthRelations);
            this.authServiceFull.updateRelsIdentifyingAuth(group.groups?.out, outgoingAuthRelations);
        }

        // ensure parent exists
        const parent = await this.get(group.parentPath, false);
        if (parent===undefined) {
            throw new Error ('INVALID_PARENT');
        }

        group.groupPath = (group.parentPath==='/') ?
            '/' + group.name.toLowerCase() :
            `${group.parentPath}/${group.name.toLowerCase()}`;

        // Assemble item into node
        group.category = TypeCategory.Group;
        const node = this.groupsAssembler.toNode(group);

        // Save to datastore
        logger.debug(`groups.full.service create: *****: ${JSON.stringify(node)}`);
        await this.groupsDao.create(node, group.groups);

        // fire event
        await this.eventEmitter.fire({
            objectId: group.groupPath,
            type: Type.group,
            event: Event.create,
            payload: JSON.stringify(group)
        });

        logger.debug(`groups.full.service create: exit: ${group.groupPath}`);
        return group.groupPath;

    }

    public async update(group: GroupItem, applyProfile?:string) : Promise<void> {
        logger.debug(`groups.full.service update: in: model:${JSON.stringify(group)}, applyProfile:${applyProfile}`);

        ow(group, ow.object.nonEmpty);
        ow(group.groupPath, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            const existing = await this.get(group.groupPath, true);
            if (existing===undefined) {
                throw new Error('NOT_FOUND');
            }
            const merged = Object.assign(new GroupItem(), existing, group);
            group = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(group);

        await this.authServiceFull.authorizationCheck([], [group.groupPath, ...group.listRelatedGroupPaths()], ClaimAccess.U);

        const labels = await this.groupsDao.getLabels([group.groupPath]);
        const templateId = labels[group.groupPath]?.[0];
        if (templateId===undefined) {
            throw new Error('NOT_FOUND');
        }

        // schema validation
        const template = await this.typesService.get(templateId, TypeCategory.Group, TypeDefinitionStatus.published);
        if (template===undefined) {
            throw new Error ('INVALID_TEMPLATE');
        }
        const subTypeValidation = await this.validator.validateSubType(template, group, Operation.UPDATE);
        if (!subTypeValidation.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        group.category = TypeCategory.Group;
        group.templateId = templateId;
        const node = this.groupsAssembler.toNode(group);

        // Save to datastore
        await this.groupsDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: group.groupPath,
            type: Type.group,
            event: Event.modify,
            payload: JSON.stringify(group)
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

        const model = await this.get(groupPath, false);
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

        // fetch the existing groups
        const sourceGroupFuture = this.get(sourceGroupPath, false);
        const targetGroupFuture = this.get(targetGroupPath, false);
        const [sourceGroup,targetGroup] = await Promise.all([sourceGroupFuture, targetGroupFuture]);
        
        // make sure they exist
        if (sourceGroup===undefined || targetGroup===undefined) {
            throw new Error('NOT_FOUND');
        }
        
        // if the relation already exists, there's no need to continue
        if (sourceGroup.groups?.out?.[relationship]?.find(e=> e.id===targetGroupPath)) {
            logger.debug(`groups.full.service attachToGroup: relation already exits:`);
            return;
        }
        
        // ensure that the group relation is allowed
        const relatedGroup: DirectionToRelatedEntityArrayMap = {
            out: {
                [relationship]: [{
                    id: targetGroupPath,
                }]
            }
        };

        const template = await this.typesService.get(sourceGroup.templateId, TypeCategory.Group, TypeDefinitionStatus.published);
        const validationResult = await this.validator.validateRelationshipsByIds(template, relatedGroup, undefined);
        if (!validationResult.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        let isAuthCheck = true;
        if (this.isAuthzEnabled) {
            const authRelations = template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(relatedGroup.out, authRelations);
            isAuthCheck = relatedGroup.out[relationship][0].isAuthCheck??false;
        }


        // Save to datastore
        await this.groupsDao.attachToGroup(sourceGroupPath, relationship, targetGroupPath, isAuthCheck);

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
