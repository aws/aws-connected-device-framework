/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { DeviceItem, BulkDevicesResult, DeviceState, DeviceItemList} from './devices.models';
import { DevicesAssembler} from './devices.assembler';
import { TYPES } from '../di/types';
import { DevicesDaoFull} from './devices.full.dao';
import { GroupsService} from '../groups/groups.service';
import {logger} from '../utils/logger';
import {TypesService} from '../types/types.service';
import {TypeCategory, Operation} from '../types/constants';
import {Node} from '../data/node';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import ow from 'ow';
import { ProfilesService } from '../profiles/profiles.service';
import { DeviceProfileItem } from '../profiles/profiles.models';
import { DevicesService } from './devices.service';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupItemList } from '../groups/groups.models';
import { DirectionStringToArrayMap } from '../data/model';
import { ClaimAccess } from '../authz/claims';
import { AuthzServiceFull } from '../authz/authz.full.service';

@injectable()
export class DevicesServiceFull implements DevicesService {

    constructor( @inject(TYPES.DevicesDao) private devicesDao: DevicesDaoFull,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.AuthzServiceFull) private authServiceFull: AuthzServiceFull,
        @inject('defaults.devices.parent.relation') public defaultDeviceParentRelation: string,
        @inject('defaults.devices.parent.groupPath') public defaultDeviceParentGroup: string,
        @inject('defaults.devices.state') public defaultDeviceState: string) {}

    public async listRelatedDevices(deviceId: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number) : Promise<DeviceItemList> {
        logger.debug(`device.full.service listRelatedDevices: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

        ow(deviceId, ow.string.nonEmpty);
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
        deviceId=deviceId.toLowerCase();
        relationship=relationship.toLowerCase();
        if (template) {
            template=template.toLowerCase();
        }
        if (state) {
            state=state.toLowerCase();
        }
        if (direction) {
            direction=direction.toLowerCase();
        }

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = (offset===undefined) ? undefined : parseInt(offset.toString(),0);
        const countAsInt =  (count===undefined) ? undefined : parseInt(count.toString(),0);

        const result  = await this.devicesDao.listRelated(deviceId, relationship, direction, template, {state}, offsetAsInt, countAsInt);

        const model = this.devicesAssembler.toRelatedDeviceModelsList(result, offsetAsInt, countAsInt);
        logger.debug(`devices.full.service listRelatedDevices: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async listRelatedGroups(deviceId: string, relationship: string, direction:string, template:string, offset:number, count:number) : Promise<GroupItemList> {
        logger.debug(`device.full.service listRelatedGroups: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);

        // defaults
        if (direction===undefined || direction===null) {
            direction = 'both';
        }
        if (template===undefined || template===null) {
            template=TypeCategory.Group;
        }

        // any ids need to be lowercase
        deviceId=deviceId.toLowerCase();
        relationship=relationship.toLowerCase();
        if (template) {
            template=template.toLowerCase();
        }
        direction=direction.toLowerCase();

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = (offset===undefined) ? undefined : parseInt(offset.toString(),0);
        const countAsInt =  (count===undefined) ? undefined : parseInt(count.toString(),0);

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        const result  = await this.devicesDao.listRelated(deviceId, relationship, direction, template, {}, offsetAsInt, countAsInt);

        const model = this.groupsAssembler.toRelatedGroupItemList(result, offsetAsInt, countAsInt);
        logger.debug(`devices.full.service listRelatedGroups: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async get(deviceId:string, expandComponents?:boolean, attributes?:string[], includeGroups?:boolean): Promise<DeviceItem> {
        logger.debug(`device.full.service get: in: deviceId:${deviceId}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        ow(deviceId, ow.string.nonEmpty);

        if (expandComponents===undefined) {
            expandComponents=false;
        }
        if (includeGroups===undefined) {
            includeGroups = true;
        }

        // any ids need to be lowercase
        deviceId=deviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        const result  = await this.devicesDao.get([deviceId], expandComponents, attributes, includeGroups);

        let model:DeviceItem;
        if (result!==undefined && result.length>0) {
            model = this.devicesAssembler.toDeviceItem(result[0]);
        }

        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getBulk(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean) : Promise<DeviceItemList> {
        logger.debug(`device.full.service getBulk: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        ow(deviceIds, ow.array.nonEmpty);

        deviceIds = deviceIds.map(d=> d.toLowerCase());

        await this.authServiceFull.authorizationCheck(deviceIds, [], ClaimAccess.R);

        const result  = await this.devicesDao.get(deviceIds, expandComponents, attributes, includeGroups);

        const model = this.devicesAssembler.toDeviceItems(result);
        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return {results: model};
    }

    public async createBulk(devices:DeviceItem[], applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.debug(`device.full.service createBulk: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);

        ow(devices, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const device of devices) {
            try {
                await this.create(device, applyProfile);
                success++;
            } catch (err) {
                errors[device.deviceId] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors
        };

        logger.debug(`device.full.service createBulk: exit: response: ${JSON.stringify(response)}`);
        return response;
    }

    public  async ___test___applyProfile(model: DeviceItem, applyProfile?:string) : Promise<DeviceItem> {
        return this.applyProfile(model, applyProfile);
    }

    private async applyProfile(model: DeviceItem, applyProfile?:string) : Promise<DeviceItem> {
        logger.debug(`device.full.service applyProfile: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        // retrieve profile
        const profile = await this.profilesService.get(model.templateId, applyProfile) as DeviceProfileItem;
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
        const {profileId, ...deviceProfileAttributes} = profile;
        const mergedModel = Object.assign(new DeviceItem(), deviceProfileAttributes, model);
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

        logger.debug(`device.full.service applyProfile: exit:${JSON.stringify(mergedModel)}`);

        return mergedModel;

    }

    public async create(model: DeviceItem, applyProfile?:string) : Promise<string> {
        logger.debug(`device.full.service create: in: model: ${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            model = await this.applyProfile(model, applyProfile);
        }

        // remove any non printable characters from the id
        model.deviceId = model.deviceId.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        // default initial association if none provided
        if ( (model.groups===undefined || (model.groups.in===undefined && model.groups.out===undefined)) &&
             (model.devices===undefined || (model.devices.in===undefined && model.devices.out===undefined)) &&
             this.defaultDeviceParentRelation!=='' && this.defaultDeviceParentGroup!=='') {
            model.groups= {
                out: {}
            };
            model.groups.out[this.defaultDeviceParentRelation] = [this.defaultDeviceParentGroup];
        }

        // we cant check authz til here, as we need to understand any related devices and groups first
        await this.authServiceFull.authorizationCheck(model.listRelatedDeviceIds(), model.listRelatedGroupPaths(), ClaimAccess.C);

        // default initial state if none provided
        if (model.state===undefined && this.defaultDeviceState!==undefined) {
            model.state = <DeviceState> this.defaultDeviceState;
        }

        // perform validation of the device...
        const validateSubTypeFuture = this.typesService.validateSubType(model.templateId, TypeCategory.Device, model, Operation.CREATE);
        const validateGroupRelationshipsFuture = this.typesService.validateRelationshipsByPath(model.templateId, model.groups);
        const validateDeviceRelationshipsFuture = this.typesService.validateRelationshipsByType(model.templateId, model.devices);
        const results = await Promise.all([validateSubTypeFuture, validateGroupRelationshipsFuture, validateDeviceRelationshipsFuture]);

        // schema validation results
        const subTypeValidation = results[0];
        if (!subTypeValidation.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // validate the path associations
        const groupRelationshipsValidation=results[1];
        if (!groupRelationshipsValidation)  {
            throw new Error('INVALID_RELATION');
        }

        // validate the device associations
        const deviceRelationshipsValidation=results[2];
        if (!deviceRelationshipsValidation)  {
            throw new Error('INVALID_RELATION');
        }

        // Assemble devicemodel into node
        model.category = TypeCategory.Device;
        const node = this.devicesAssembler.toNode(model);

        // Assemble the devices components
        const components: Node[]=[];
        if (model.components!==undefined) {
            model.components.forEach(c=> {
                c.category = TypeCategory.Component;
                components.push(this.devicesAssembler.toNode(c));
            });
        }

        // Save to datastore
        const id = await this.devicesDao.create(node, model.groups, model.devices, components);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.deviceId,
            type: Type.device,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        logger.debug(`device.full.service create: exit: id: ${id}`);
        return id;

    }

    private setIdsToLowercase(model:DeviceItem) {
        logger.debug(`device.full.service setIdsToLowercase: in:`);

        model.deviceId = model.deviceId.toLowerCase();
        if (model.templateId!==undefined) {
            model.templateId = model.templateId.toLowerCase();
        }
        if (model.groups) {
            if (model.groups.in) {
                Object.keys(model.groups.in).forEach(k=> {
                    model.groups.in[k] = model.groups.in[k].map(p => {
                        if (p===undefined) {
                            return p;
                        } else {
                            return p.toLowerCase();
                        }
                    });
                });
            }
            if (model.groups.out) {
                Object.keys(model.groups.out).forEach(k=> {
                    model.groups.out[k] = model.groups.out[k].map(p => {
                        if (p===undefined) {
                            return p;
                        } else {
                            return p.toLowerCase();
                        }
                    });
                });
            }

        }
        if (model.devices) {
            if (model.devices.in)  {
                Object.keys(model.devices.in).forEach(k=> {
                    model.devices.in[k] = model.devices.in[k].map(d => {
                        if (d===undefined) {
                            return d;
                        } else {
                            return d.toLowerCase();
                        }
                    });
                });
            }
            if (model.devices.out)  {
                Object.keys(model.devices.out).forEach(k=> {
                    model.devices.out[k] = model.devices.out[k].map(d => {
                        if (d===undefined) {
                            return d;
                        } else {
                            return d.toLowerCase();
                        }
                    });
                });
            }
        }
        if (model.components) {
            model.components = model.components.map(c => {
                if (c && c.deviceId) {
                    c.deviceId = c.deviceId.toLowerCase();
                }
                return c;
            });
        }
        logger.debug(`device.full.service setIdsToLowercase: exit:`);
    }

    public async updateBulk(devices:DeviceItem[], applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.debug(`device.full.service updateBulk: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);

        ow(devices, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const device of devices) {
            try {
                await this.update(device, applyProfile);
                success++;
            } catch (err) {
                errors[device.deviceId] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors
        };

        logger.debug(`device.full.service updateBulk: exit: response: ${response}`);
        return response;
    }

    public async update(model:DeviceItem, applyProfile?:string) : Promise<void> {
        logger.debug(`device.full.service update: in: model: ${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            const existing = await this.get(model.deviceId);
            if (existing===undefined) {
                throw new Error('NOT_FOUND');
            }
            const merged = Object.assign(new DeviceItem(), existing, model);
            model = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        const deviceIds=model.listRelatedDeviceIds();
        deviceIds.push(model.deviceId);
        await this.authServiceFull.authorizationCheck(deviceIds, model.listRelatedGroupPaths(), ClaimAccess.U);

        const labels = await this.devicesDao.getLabels(model.deviceId);
        if (labels===undefined) {
            throw new Error('NOT_FOUND');
        }

        const templateId = labels.filter(l=> l!=='device' && l!=='component')[0];

        // schema validation
        const validate = await this.typesService.validateSubType(templateId, TypeCategory.Device, model, Operation.UPDATE);
        if (!validate.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Assemble devicemodel into node
        model.category = TypeCategory.Device;
        model.templateId = templateId;
        const node = this.devicesAssembler.toNode(model);

        // Save to datastore
        await this.devicesDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.deviceId,
            type: Type.device,
            event: Event.modify,
            payload: JSON.stringify(model)
        });

        logger.debug(`device.full.service update: exit:`);

    }

    public async delete(deviceId: string) {
        logger.debug(`device.full.service delete: in: deviceId: ${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.D);

        const device = await this.get(deviceId, false, undefined, true);

        // Save to datastore
        await this.devicesDao.delete(deviceId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.delete,
            payload: JSON.stringify(device)
        });

        logger.debug(`device.full.service delete: exit:`);

    }

    public async attachToGroup(deviceId:string, relationship:string, direction:string, groupPath:string) {
        logger.debug(`device.full.service attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(direction, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [groupPath], ClaimAccess.U);

        // fetch the existing device / group
        const deviceFuture = this.get(deviceId, false, [], true);
        const groupFuture = this.groupsService.get(groupPath);
        const results = await Promise.all([deviceFuture, groupFuture]);
        const device = results[0];
        const group = results[1];

        // make sure they exist
        if (device===undefined || group===undefined) {
            throw new Error('NOT_FOUND');
        }

        // if the relation already exists, there's no need to continue
        if (device.groups !== undefined && device.groups[direction] !== undefined && device.groups[direction][relationship] !== undefined &&
            device.groups[direction][relationship].includes(groupPath)) {
            logger.debug(`device.full.service attachToGroup: relation already exits:`);
            return;
        }

        // ensure that the group relation is allowed
        const rels: DirectionStringToArrayMap = {};
        rels[direction]= {};
        rels[direction][relationship] = [ group.groupPath ];

        const isValid = await this.typesService.validateRelationshipsByPath(device.templateId, rels);
        if (!isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Save to datastore
        await this.devicesDao.attachToGroup(deviceId, relationship, direction, groupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToGroup: groupPath,
                relationship
            }
        });

        logger.debug(`device.full.service attachToGroup: exit:`);
    }

    public async detachFromGroup(deviceId:string, relationship:string, direction:string, groupPath:string) {
        logger.debug(`device.full.service detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(direction, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [groupPath], ClaimAccess.U);

        // Save to datastore
        await this.devicesDao.detachFromGroup(deviceId, relationship, direction, groupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                detachedFromGroup: groupPath,
                relationship
            }
        });

        logger.debug(`device.full.service detachFromGroup: exit:`);
    }

    public async attachToDevice(deviceId:string, relationship:string, direction:string, otherDeviceId:string) {
        logger.debug(`device.full.service attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(direction, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId, otherDeviceId], [], ClaimAccess.U);

        // fetch the existing device / group
        const deviceFuture = this.get(deviceId, false, [], false);
        const otherDeviceFuture = this.get(otherDeviceId, false, [], false);
        const results = await Promise.all([deviceFuture, otherDeviceFuture]);
        const device = results[0];
        const otherDevice = results[1];

        // make sure they exist
        if (device===undefined || otherDevice===undefined) {
            throw new Error('NOT_FOUND');
        }

        // if the relation already exists, there's no need to continue
        if (device.devices!==undefined && device.devices[direction]!==undefined && device.devices[direction][relationship].includes(otherDeviceId)) {
            logger.debug(`device.full.service attachToDevice: relation already exits:`);
            return;
        }

        // ensure that the relation is allowed
        const rels: DirectionStringToArrayMap = {};
        rels[direction]= {};
        rels[direction][relationship] = [otherDeviceId];
        const isValid = await this.typesService.validateRelationshipsByType(device.templateId, rels);
        if (!isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Save to datastore
        await this.devicesDao.attachToDevice(deviceId, relationship, direction, otherDeviceId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToDevice: otherDeviceId,
                relationship
            }
        });

        logger.debug(`device.full.service attachToDevice: exit:`);
    }

    public async detachFromDevice(deviceId:string, relationship:string, direction:string, otherDeviceId:string) {
        logger.debug(`device.full.service detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(direction, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId, otherDeviceId], [], ClaimAccess.U);

        // Save to datastore
        await this.devicesDao.detachFromDevice(deviceId, relationship, direction, otherDeviceId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                detachedFromDevice: otherDeviceId,
                relationship
            }
        });

        logger.debug(`device.full.service detachFromDevice: exit:`);
    }

    public async updateComponent(deviceId:string, componentId:string, model:DeviceItem) : Promise<void> {
        logger.debug(`device.full.service updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, model:${JSON.stringify(model)}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(componentId, ow.string.nonEmpty);
        ow(model, ow.object.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        componentId = componentId.toLowerCase();
        this.setIdsToLowercase(model);

        await this.authServiceFull.authorizationCheck([componentId], [], ClaimAccess.U);

        // Assemble devicemodel into node
        model.category = TypeCategory.Component;
        const node = this.devicesAssembler.toNode(model);
        node.attributes['deviceId'] = `${deviceId}___${componentId}`;

        // Save to datastore
        this.devicesDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            payload: JSON.stringify(model),
            attributes: {
                deviceId,
                componentId
            }
        });

        logger.debug(`device.full.service updateComponent: exit:`);
    }

    public async deleteComponent(deviceId:string, componentId:string) : Promise<void> {
        logger.debug(`device.full.service deleteComponent: in: deviceId:${deviceId}, componentId:${componentId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(componentId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        componentId = componentId.toLowerCase();

        await this.authServiceFull.authorizationCheck([componentId], [], ClaimAccess.D);

        // Assemble devicemodel into node
        const dbId = `${deviceId}___${componentId}`;

        // Save to datastore
        await this.devicesDao.delete(dbId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.delete,
            attributes: {
                deviceId,
                componentId
            }
        });

        logger.debug(`device.full.service deleteComponent: exit:`);

    }

    public async createComponent(parentDeviceId:string, model:DeviceItem) : Promise<string> {
        logger.debug(`device.full.service createComponent: in: parentDeviceId:${parentDeviceId}, model:${JSON.stringify(model)}`);

        ow(parentDeviceId, ow.string.nonEmpty);
        ow(model, ow.object.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);

        // any ids need to be lowercase
        parentDeviceId = parentDeviceId.toLowerCase();
        this.setIdsToLowercase(model);

        await this.authServiceFull.authorizationCheck([parentDeviceId], [], ClaimAccess.C);

        // perform validation of the device...
        const validateSubTypeFuture = this.typesService.validateSubType(model.templateId, TypeCategory.Component, model, Operation.CREATE);
        const validateRelationshipsFuture = this.typesService.validateRelationshipsByType(model.templateId, model.groups);
        const results = await Promise.all([validateSubTypeFuture, validateRelationshipsFuture]);

        // schema validation results
        const subTypeValidation = results[0];
        if (!subTypeValidation.isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // validate the path associations
        const relationshipsValidation=results[1];
        if (!relationshipsValidation)  {
            throw new Error('UNDEFINED_RELATIONS');
        }

        // ensure the device exists
        const parent = await this.devicesDao.get([parentDeviceId], false, [], false);
        if (parent===undefined) {
            throw new Error('NOT_FOUND');
        }

        // Assemble devicemodel into node
        model.category = TypeCategory.Component;
        const node = this.devicesAssembler.toNode(model);

        // Save to datastore
        const id = await this.devicesDao.createComponent(parentDeviceId, node);

        // fire event
        await this.eventEmitter.fire({
            objectId: parentDeviceId,
            type: Type.device,
            event: Event.create,
            payload: JSON.stringify(model),
            attributes: {
                deviceId: parentDeviceId,
                componentId: id
            }
        });

        logger.debug(`device.full.service createComponent: exit: id: ${id}`);
        return id;

    }

}
