/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { DeviceModel, BulkDevicesResult, BulkDevicesRequest, DeviceState, DeviceListResult} from './devices.models';
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
import { DeviceProfileModel } from '../profiles/profiles.models';
import { DevicesService } from './devices.service';

@injectable()
export class DevicesServiceFull implements DevicesService {

    constructor( @inject(TYPES.DevicesDao) private devicesDao: DevicesDaoFull,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject('defaults.devices.parent.relation') public defaultDeviceParentRelation: string,
        @inject('defaults.devices.parent.groupPath') public defaultDeviceParentGroup: string,
        @inject('defaults.devices.state') public defaultDeviceState: string) {}

    public async get(deviceId:string, expandComponents?:boolean, attributes?:string[], includeGroups?:boolean): Promise<DeviceModel> {
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

        const result  = await this.devicesDao.get([deviceId], expandComponents, attributes, includeGroups);

        let model:DeviceModel;
        if (result!==undefined && result.length>0) {
            model = this.devicesAssembler.toDeviceModel(result[0]);
        }

        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getBulk(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean) : Promise<DeviceListResult> {
        logger.debug(`device.full.service getBulk: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        ow(deviceIds, ow.array.nonEmpty);

        deviceIds = deviceIds.map(d=> d.toLowerCase());

        const result  = await this.devicesDao.get(deviceIds, expandComponents, attributes, includeGroups);

        const model = this.devicesAssembler.toDeviceModels(result);
        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return {results: model};
    }

    public async createBulk(request:BulkDevicesRequest, applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.debug(`device.full.service createBulk: in: request: ${JSON.stringify(request)}, applyProfile:${applyProfile}`);

        ow(request, ow.object.nonEmpty);
        ow(request.devices, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const device of request.devices) {
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

        logger.debug(`device.full.service createBulk: exit: response: ${response}`);
        return response;
    }

    public  async ___test___applyProfile(model: DeviceModel, applyProfile?:string) : Promise<DeviceModel> {
        return this.applyProfile(model, applyProfile);
    }

    private async applyProfile(model: DeviceModel, applyProfile?:string) : Promise<DeviceModel> {
        logger.debug(`device.full.service applyProfile: in: model:${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        // retrieve profile
        const profile = await this.profilesService.get(model.templateId, applyProfile) as DeviceProfileModel;
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
        const {profileId, ...deviceProfileAttributes} = profile;
        const mergedModel = {...deviceProfileAttributes, ...model};
        const mergedAttributes = {...profile.attributes, ...model.attributes};
        const mergedGroups = {...profile.groups, ...model.groups};
        mergedModel.attributes = mergedAttributes;
        mergedModel.groups = mergedGroups;

        logger.debug(`device.full.service applyProfile: exit:${JSON.stringify(mergedModel)}`);

        return mergedModel;

    }

    public async create(model: DeviceModel, applyProfile?:string) : Promise<string> {
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
        if (model.groups===undefined && model.devices===undefined && this.defaultDeviceParentRelation!==undefined && this.defaultDeviceParentGroup!==undefined) {
            model.groups= {};
            model.groups[this.defaultDeviceParentRelation] = [this.defaultDeviceParentGroup];
        }

        // default initial state if none provided
        if (model.state===undefined && this.defaultDeviceState!==undefined) {
            model.state = <DeviceState> this.defaultDeviceState;
        }

        // perform validation of the device...
        const validateSubTypeFuture = this.typesService.validateSubType(model.templateId, TypeCategory.Device, model, Operation.CREATE);
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

    private setIdsToLowercase(model:DeviceModel) {
        logger.debug(`device.full.service setIdsToLowercase: in:`);

        model.deviceId = model.deviceId.toLowerCase();
        if (model.templateId!==undefined) {
            model.templateId = model.templateId.toLowerCase();
        }
        if (model.groups) {
            Object.keys(model.groups).forEach(k=> {
                model.groups[k] = model.groups[k].map(p => {
                    if (p===undefined) {
                        return p;
                    } else {
                        return p.toLowerCase();
                    }
                });
            });
        }
        if (model.devices) {
            Object.keys(model.devices).forEach(k=> {
                model.devices[k] = model.devices[k].map(d => {
                    if (d===undefined) {
                        return d;
                    } else {
                        return d.toLowerCase();
                    }
                });
            });
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

    public async updateBulk(request:BulkDevicesRequest, applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.debug(`device.full.service updateBulk: in: request: ${JSON.stringify(request)}, applyProfile:${applyProfile}`);

        ow(request, ow.object.nonEmpty);
        ow(request.devices, ow.array.nonEmpty);

        let success=0;
        let failed=0;
        const errors: {[key:string]:string}= {};
        for(const device of request.devices) {
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

    public async update(model:DeviceModel, applyProfile?:string) : Promise<void> {
        logger.debug(`device.full.service update: in: model: ${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile!==undefined) {
            const existing = await this.get(model.deviceId);
            if (existing===undefined) {
                throw new Error('NOT_FOUND');
            }
            const merged = {...existing, ...model};
            model = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        const labels = await this.devicesDao.getLabels(model.deviceId);
        if (labels===undefined) {
            return undefined;
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

    public async attachToGroup(deviceId:string, relationship:string, groupPath:string) {
        logger.debug(`device.full.service attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        // fetch the existing device / group
        const deviceFuture = this.get(deviceId, false, [], false);
        const groupFuture = this.groupsService.get(groupPath);
        const results = await Promise.all([deviceFuture, groupFuture]);
        const device = results[0];
        const group = results[1];

        // make sure they exist
        if (device===undefined || group===undefined) {
            throw new Error('NOT_FOUND');
        }

        // if the relation already exists, there's no need to continue
        if (device.groups[relationship].includes(groupPath)) {
            logger.debug(`device.full.service attachToGroup: relation already exits:`);
            return;
        }

        // ensure that the group relation is allowed
        const out: {[key:string]:string[]} = {};
        out[relationship] = [ group.templateId ];
        const isValid = await this.typesService.validateRelationshipsByType(device.templateId, out);
        if (!isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Save to datastore
        await this.devicesDao.attachToGroup(deviceId, relationship, groupPath);

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

    public async detachFromGroup(deviceId:string, relationship:string, groupPath:string) {
        logger.debug(`device.full.service detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        // Save to datastore
        await this.devicesDao.detachFromGroup(deviceId, relationship, groupPath);

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

    public async attachToDevice(deviceId:string, relationship:string, otherDeviceId:string) {
        logger.debug(`device.full.service attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

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
        if (device.devices[relationship].includes(otherDeviceId)) {
            logger.debug(`device.full.service attachToDevice: relation already exits:`);
            return;
        }

        // ensure that the relation is allowed
        const out: {[key:string]:string[]} = {};
        out[relationship] = [otherDeviceId];
        const isValid = await this.typesService.validateRelationshipsByPath(device.templateId, out);
        if (!isValid) {
            throw new Error('FAILED_VALIDATION');
        }

        // Save to datastore
        await this.devicesDao.attachToDevice(deviceId, relationship, otherDeviceId);

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

    public async detachFromDevice(deviceId:string, relationship:string, otherDeviceId:string) {
        logger.debug(`device.full.service detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

        // Save to datastore
        await this.devicesDao.detachFromDevice(deviceId, relationship, otherDeviceId);

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

    public async updateComponent(deviceId:string, componentId:string, model:DeviceModel) : Promise<void> {
        logger.debug(`device.full.service updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, model:${JSON.stringify(model)}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(componentId, ow.string.nonEmpty);
        ow(model, ow.object.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        componentId = componentId.toLowerCase();
        this.setIdsToLowercase(model);

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

    public async createComponent(parentDeviceId:string, model:DeviceModel) : Promise<string> {
        logger.debug(`device.full.service createComponent: in: parentDeviceId:${parentDeviceId}, model:${JSON.stringify(model)}`);

        ow(parentDeviceId, ow.string.nonEmpty);
        ow(model, ow.object.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);

        // any ids need to be lowercase
        parentDeviceId = parentDeviceId.toLowerCase();
        this.setIdsToLowercase(model);

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
