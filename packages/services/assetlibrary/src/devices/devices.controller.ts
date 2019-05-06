/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, httpGet, response, requestParam, requestBody, httpPost, httpPut, httpDelete, queryParam, httpPatch } from 'inversify-express-utils';
import { inject } from 'inversify';
import { DeviceModel } from './devices.models';
import { DevicesService } from './devices.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';

@controller('/devices')
export class DevicesController implements interfaces.Controller {

    constructor( @inject(TYPES.DevicesService) private devicesService: DevicesService) {}

    @httpGet('/:deviceId')
    public async getDevice(@requestParam('deviceId') deviceId: string, @queryParam('includeComponents') components: string,
        @queryParam('attributes') attributes:string, @queryParam('includeGroups') groups: string, @response() res: Response): Promise<DeviceModel> {

        logger.info(`device.controller getDevice: in: deviceId:${deviceId}, components:${components}, attributes:${attributes}, groups:${groups}`);

        let attributesArray:string[];
        if (attributes!==undefined) {
            if(attributes==='') {
                attributesArray=[];
            } else {
                attributesArray=attributes.split(',');
            }
        }

        try {
            const includeComponents = (components==='true');
            const includeGroups = (groups!=='false');
            const model = await this.devicesService.get(deviceId, includeComponents, attributesArray, includeGroups);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404).end();
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPost('')
    public async createDevice(@requestBody() device:DeviceModel, @response() res:Response, @queryParam('applyProfile') applyProfile?:string) {
        logger.info(`device.controller  createDevice: in: device:${JSON.stringify(device)}, applyProfile:${applyProfile}`);
        try {
            await this.devicesService.create(device, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:deviceId')
    public async updateDevice(@requestBody() device: DeviceModel, @response() res: Response, @requestParam('deviceId') deviceId: string,
    @queryParam('applyProfile') applyProfile?:string) {

        logger.info(`device.controller updateDevice: in: deviceId: ${deviceId}, device: ${JSON.stringify(device)}, applyProfile:${applyProfile}`);
        try {
            device.deviceId = deviceId;
            await this.devicesService.update(device, applyProfile);
            res.status(204).end();
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId')
    public async deleteDevice(@response() res: Response, @requestParam('deviceId') deviceId: string) {

        logger.info(`device.controller deleteDevice: in: deviceId: ${deviceId}`);
        try {
            await this.devicesService.delete(deviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPut('/:deviceId/:relationship/groups/:groupPath')
    public async attachToGroup(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string, @response() res: Response) {

        logger.info(`devices.controller attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);
        try {
            await this.devicesService.attachToGroup(deviceId, relationship, groupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/:relationship/groups/:groupPath')
    public async detachFromGroup(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string, @response() res: Response) {

        logger.info(`devices.controller detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);
        try {
            await this.devicesService.detachFromGroup(deviceId, relationship, groupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPut('/:deviceId/:relationship/devices/:otherDeviceId')
    public async attachToDevice(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) {

        logger.info(`devices.controller attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);
        try {
            await this.devicesService.attachToDevice(deviceId, relationship, otherDeviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/:relationship/devices/:otherDeviceId')
    public async detachFromDevice(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) {

        logger.info(`devices.controller detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);
        try {
            await this.devicesService.detachFromDevice(deviceId, relationship, otherDeviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPost('/:deviceId/components')
    public async createComponent(@requestParam('deviceId') deviceId: string,
        @requestBody() component: DeviceModel, @response() res: Response) {

        logger.info(`devices.controller createComponent: in: deviceId:${deviceId}, component:${JSON.stringify(component)}`);
        try {
            await this.devicesService.createComponent(deviceId, component);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:deviceId/components/:componentId')
    public async updateComponent(@requestParam('deviceId') deviceId: string, @requestParam('componentId') componentId: string,
        @requestBody() component: DeviceModel, @response() res: Response) {

        logger.info(`devices.controller updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, component:${JSON.stringify(component)}`);
        try {
            await this.devicesService.updateComponent(deviceId, componentId, component);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/components/:componentId')
    public async deleteComponent(@requestParam('deviceId') deviceId: string, @requestParam('componentId') componentId: string,
        @response() res: Response) {

        logger.info(`devices.controller deleteComponent: in: deviceId:${deviceId}, componentId:${componentId}`);
        try {
            await this.devicesService.deleteComponent(deviceId, componentId);
        } catch (e) {
            handleError(e,res);
        }
    }

}
