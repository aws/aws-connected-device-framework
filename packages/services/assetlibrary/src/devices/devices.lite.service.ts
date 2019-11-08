/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { BulkDevicesResult, DeviceItemList, DeviceItem} from './devices.models';
import { DevicesService } from './devices.service';
import {logger} from '../utils/logger';
import ow from 'ow';
import { TYPES } from '../di/types';
import { DevicesDaoLite } from './devices.lite.dao';
import { DevicesAssembler } from './devices.assembler';
import { TypeCategory } from '../types/constants';
import { EventEmitter, Type, Event } from '../events/eventEmitter.service';
import { GroupItemList } from '../groups/groups.models';

@injectable()
export class DevicesServiceLite implements DevicesService {

    constructor( @inject(TYPES.DevicesDao) private devicesDao: DevicesDaoLite,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async listRelatedDevices(_deviceId: string, _relationship: string, _direction:string, _template:string, _state:string, _offset:number, _count:number) : Promise<DeviceItemList> {
        throw new Error('NOT_SUPPORTED');
    }

    public async get(deviceId:string, _expandComponents?:boolean, _attributes?:string[], _includeGroups?:boolean): Promise<DeviceItem> {
        logger.debug(`devices.lite.service get: in: deviceId:${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        const result  = await this.devicesDao.get(deviceId);

        const model = this.devicesAssembler.toDeviceItem(result);

        logger.debug(`devices.lite.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getBulk(deviceIds:string[], _expandComponents?:boolean, _attributes?:string[], _includeGroups?:boolean) : Promise<DeviceItemList> {
        logger.debug(`devices.lite.service getBulk: in: deviceIds:${deviceIds}`);

        ow(deviceIds, ow.array.nonEmpty);

        const models: DeviceItem[]=[];
        for(const deviceId of deviceIds) {
            models.push(await this.get(deviceId));
        }
        const r = {results: models};
        logger.debug(`device.lite.service get: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public async createBulk(_devices:DeviceItem[], _applyProfile?:string) : Promise<BulkDevicesResult> {
        throw new Error('NOT_SUPPORTED');
    }

    public async create(model: DeviceItem, applyProfile?:string) : Promise<string> {
        logger.debug(`devices.lite.service create: in: model: ${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);

        // remove any non printable characters from the id
        model.deviceId = model.deviceId.replace(/[^\x20-\x7E]+/g, '');

        // NOTE:  no schema validation supported in lite mode

        // Assemble model into node
        model.category = TypeCategory.Device;
        const node = this.devicesAssembler.toNode(model);

        // NOTE: Device components not supported in lite mode

        // Save to datastore
        let groups:string[]=[];
        if (model.groups) {
            Object.keys(model.groups).forEach(k=> groups = groups.concat(model.groups[k]));
        }
        const id = await this.devicesDao.create(node, groups);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.deviceId,
            type: Type.device,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        logger.debug(`devices.lite.service create: exit: id: ${id}`);
        return id;
    }

    public async updateBulk(_devices:DeviceItem[], _applyProfile?:string) : Promise<BulkDevicesResult> {
        throw new Error('NOT_SUPPORTED');
    }

    public async update(model:DeviceItem, applyProfile?:string) : Promise<void> {
        logger.debug(`devices.lite.service update: in: model: ${JSON.stringify(model)}, applyProfile:${applyProfile}`);

        ow(model, ow.object.nonEmpty);
        ow(model.deviceId, ow.string.nonEmpty);
        ow(applyProfile, ow.undefined);

        model.category = TypeCategory.Device;

        // NOTE: schema validation not supported in 'lite' mode

        // as 'lite' only supports updating full resources, we need to fetch the original, then merge thge changes
        const existing = await this.get(model.deviceId);
        if (existing===undefined) {
            throw new Error('NOT_FOUND');
        }
        const merged = Object.assign(new DeviceItem(), existing, model);
        merged.attributes = {...existing.attributes, ...model.attributes};

        // Save to datastore
        const node = this.devicesAssembler.toNode(merged);
        await this.devicesDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.deviceId,
            type: Type.device,
            event: Event.modify,
            payload: JSON.stringify(model)
        });

        logger.debug(`devices.lite.full.service update: exit:`);
    }

    public async delete(deviceId: string) {
        logger.debug(`device.lite.service delete: in: deviceId: ${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        const device = await this.get(deviceId);

        // Save to datastore
        await this.devicesDao.delete(deviceId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.delete,
            payload: JSON.stringify(device)
        });

        logger.debug(`device.lite.service delete: exit:`);
    }

    public async attachToGroup(deviceId:string, _relationship:string, _direction:string, groupPath:string) {
        logger.debug(`device.lite.service attachToGroup: in: deviceId:${deviceId}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // Save to datastore
        await this.devicesDao.attachToGroup(deviceId, groupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToGroup: groupPath,
                relationship: 'group'
            }
        });

        logger.debug(`device.lite.service attachToGroup: exit:`);
    }

    public async detachFromGroup(deviceId:string, _relationship:string, _direction:string, groupPath:string) {
        logger.debug(`device.lite.service detachFromGroup: in: deviceId:${deviceId}, groupPath:${groupPath}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        // Save to datastore
        await this.devicesDao.detachFromGroup(deviceId, groupPath);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToGroup: groupPath,
                relationship: 'group'
            }
        });

        logger.debug(`device.lite.service attachToGroup: exit:`);
    }

    public async attachToDevice(_deviceId:string, _relationship:string, _direction:string, _otherDeviceId:string) {
        throw new Error('NOT_SUPPORTED');
    }

    public async detachFromDevice(_deviceId:string, _relationship:string, _direction:string, _otherDeviceId:string) {
        throw new Error('NOT_SUPPORTED');
    }

    public async updateComponent(_deviceId:string, _componentId:string, _model:DeviceItem) : Promise<void> {
        throw new Error('NOT_SUPPORTED');
    }

    public async deleteComponent(_deviceId:string, _componentId:string) : Promise<void> {
        throw new Error('NOT_SUPPORTED');
    }

    public async createComponent(_parentDeviceId:string, _model:DeviceItem) : Promise<string> {
        throw new Error('NOT_SUPPORTED');
    }

    public async listRelatedGroups(_deviceId: string, _relationship: string, _direction:string, _template:string, _offset:number, _count:number) : Promise<GroupItemList> {
        throw new Error('NOT_SUPPORTED');
    }

}
