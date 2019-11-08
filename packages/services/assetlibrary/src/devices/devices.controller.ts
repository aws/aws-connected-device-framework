/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response, Request } from 'express';
import { interfaces, controller, httpGet, response, request, requestParam, requestBody, httpPost, httpPut, httpDelete, queryParam, httpPatch } from 'inversify-express-utils';
import { inject } from 'inversify';
import { Device10Resource, DeviceResourceList, Device20Resource } from './devices.models';
import { DevicesService } from './devices.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { GroupResourceList } from '../groups/groups.models';
import { DevicesAssembler } from './devices.assembler';
import { GroupsAssembler } from '../groups/groups.assembler';

@controller('/devices')
export class DevicesController implements interfaces.Controller {

    constructor( @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    @httpGet('/:deviceId')
    public async getDevice(@requestParam('deviceId') deviceId:string, @queryParam('expandComponents') components:string,
        @queryParam('attributes') attributes:string, @queryParam('includeGroups') groups: string, @request() req: Request,
        @response() res: Response): Promise<Device10Resource|Device20Resource> {

        logger.info(`device.controller getDevice: in: deviceId:${deviceId}, components:${components}, attributes:${attributes},
            groups:${groups}, version:${req['version']}`);

        let attributesArray:string[];
        if (attributes!==undefined) {
            if(attributes==='') {
                attributesArray=[];
            } else {
                attributesArray=attributes.split(',');
            }
        }

        try {
            const includeGroups = (groups!=='false');
            const expandComponents = (components!=='false');
            const model = await this.devicesService.get(deviceId, expandComponents, attributesArray, includeGroups);
            const resource = this.devicesAssembler.toDeviceResource(model, req['version']);
            logger.debug(`controller exit: ${JSON.stringify(resource)}`);

            if (model===undefined) {
                res.status(404).end();
            } else {
                return resource;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPost('')
    public async createDevice(@requestBody() device:Device10Resource|Device20Resource, @response() res:Response, @queryParam('applyProfile') applyProfile?:string) : Promise<void> {
        logger.info(`device.controller  createDevice: in: device:${JSON.stringify(device)}, applyProfile:${applyProfile}`);
        try {
            const item = this.devicesAssembler.fromDeviceResource(device);
            await this.devicesService.create(item, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:deviceId')
    public async updateDevice(@requestBody() device: Device10Resource|Device20Resource, @response() res: Response, @requestParam('deviceId') deviceId: string,
    @queryParam('applyProfile') applyProfile?:string) : Promise<void> {

        logger.info(`device.controller updateDevice: in: deviceId: ${deviceId}, device: ${JSON.stringify(device)}, applyProfile:${applyProfile}`);
        try {
            device.deviceId = deviceId;
            const item = this.devicesAssembler.fromDeviceResource(device);
            await this.devicesService.update(item, applyProfile);
            res.status(204).end();
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId')
    public async deleteDevice(@response() res: Response, @requestParam('deviceId') deviceId: string) : Promise<void> {

        logger.info(`device.controller deleteDevice: in: deviceId: ${deviceId}`);
        try {
            await this.devicesService.delete(deviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPut('/:deviceId/:relationship/groups/:groupPath')
    public async attachToGroup(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);
        await this.attachToGroupWithDirection(deviceId, relationship, 'out', groupPath, res);
    }

    @httpDelete('/:deviceId/:relationship/groups/:groupPath')
    public async detachFromGroup(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`);
        await this.detachFromGroupWithDirection(deviceId, relationship, 'out', groupPath, res);
    }

    @httpPut('/:deviceId/:relationship/:direction/groups/:groupPath')
    public async attachToGroupWithDirection(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string, @requestParam('groupPath') groupPath: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller attachToGroupWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);
        try {
            await this.devicesService.attachToGroup(deviceId, relationship, direction, groupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/:relationship/:direction/groups/:groupPath')
    public async detachFromGroupWithDirection(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string, @requestParam('groupPath') groupPath: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller detachFromGroupWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`);
        try {
            await this.devicesService.detachFromGroup(deviceId, relationship, direction, groupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:deviceId/:relationship/groups')
    public async listDeviceRelatedGroups(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @queryParam('direction') direction:string, @queryParam('template') template:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @request() req:Request, @response() res: Response) : Promise<GroupResourceList> {

        logger.info(`devices.controller listDeviceRelatedGroups: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);

        let r: GroupResourceList = {results:[]};

        try {
            const items = await this.devicesService.listRelatedGroups(deviceId, relationship, direction, template, offset, count);
            if (r===undefined) {
                res.status(404);
            }

            r = this.groupsAssembler.toGroupResourceList(items, req['version']);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`devices.controller listDeviceRelatedGroups: exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpPut('/:deviceId/:relationship/devices/:otherDeviceId')
    public async attachToDevice(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);
        await this.attachToDeviceWithDirection(deviceId, relationship, 'out', otherDeviceId, res);
    }

    @httpDelete('/:deviceId/:relationship/devices/:otherDeviceId')
    public async detachFromDevice(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`);
        await this.detachFromDeviceWithDirection(deviceId, relationship, 'out', otherDeviceId, res);
    }

    @httpPut('/:deviceId/:relationship/:direction/devices/:otherDeviceId')
    public async attachToDeviceWithDirection(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string, @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller attachToDeviceWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);
        try {
            await this.devicesService.attachToDevice(deviceId, relationship, direction, otherDeviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/:relationship/:direction/devices/:otherDeviceId')
    public async detachFromDeviceWithDirection(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string, @requestParam('otherDeviceId') otherDeviceId: string, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller detachFromDeviceWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`);
        try {
            await this.devicesService.detachFromDevice(deviceId, relationship, direction, otherDeviceId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:deviceId/:relationship/devices')
    public async listDeviceRelatedDevices(@requestParam('deviceId') deviceId: string, @requestParam('relationship') relationship: string, @queryParam('direction') direction: string,
    @queryParam('template') template:string, @queryParam('state') state:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @request() req: Request, @response() res: Response) : Promise<DeviceResourceList> {

        logger.info(`devices.controller listDeviceRelatedDevices: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

        let r: DeviceResourceList= {results:[]};

        try {
            const items = await this.devicesService.listRelatedDevices(deviceId, relationship, direction, template, state, offset, count);
            if (items===undefined) {
                res.status(404);
            }

            r = this.devicesAssembler.toDeviceResourceList(items, req['version']);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`devices.controller exit: ${JSON.stringify(r)}`);

        return r;
    }

    @httpPost('/:deviceId/components')
    public async createComponent(@requestParam('deviceId') deviceId: string,
        @requestBody() component: Device10Resource|Device20Resource, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller createComponent: in: deviceId:${deviceId}, component:${JSON.stringify(component)}`);
        try {
            const item = this.devicesAssembler.fromDeviceResource(component);
            await this.devicesService.createComponent(deviceId, item);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:deviceId/components/:componentId')
    public async updateComponent(@requestParam('deviceId') deviceId: string, @requestParam('componentId') componentId: string,
        @requestBody() component: Device10Resource|Device20Resource, @response() res: Response) : Promise<void> {

        logger.info(`devices.controller updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, component:${JSON.stringify(component)}`);
        try {
            const item = this.devicesAssembler.fromDeviceResource(component);
            await this.devicesService.updateComponent(deviceId, componentId, item);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:deviceId/components/:componentId')
    public async deleteComponent(@requestParam('deviceId') deviceId: string, @requestParam('componentId') componentId: string,
        @response() res: Response) : Promise<void> {

        logger.info(`devices.controller deleteComponent: in: deviceId:${deviceId}, componentId:${componentId}`);
        try {
            await this.devicesService.deleteComponent(deviceId, componentId);
        } catch (e) {
            handleError(e,res);
        }
    }

}
