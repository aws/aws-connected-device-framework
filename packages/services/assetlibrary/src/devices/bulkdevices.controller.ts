/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Request, Response } from 'express';
import { interfaces, controller, response, request, requestBody, httpPost, httpPatch, httpGet, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { DevicesService } from './devices.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { BulkDevicesResource, BulkDevicesResult, DeviceResourceList } from './devices.models';
import { DevicesAssembler } from './devices.assembler';

@controller('/bulkdevices')
export class BulkDevicesController implements interfaces.Controller {

    constructor( @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler) {}

    @httpPost('')
    public async bulkCreateDevices(@requestBody() devices: BulkDevicesResource, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.info(`bulkdevices.controller  bulkCreateDevices: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);
        try {
            const items = this.devicesAssembler.fromBulkDevicesResource(devices);
            const result = await this.devicesService.createBulk(items, applyProfile);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPatch('')
    public async bulkUpdateDevices(@requestBody() devices: BulkDevicesResource, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.info(`bulkdevices.controller  bulkUpdateDevices: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);
        try {
            const items = this.devicesAssembler.fromBulkDevicesResource(devices);
            const result = await this.devicesService.updateBulk(items, applyProfile);
            res.status(204);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpGet('')
    public async bulkGetDevices(@queryParam('deviceIds') deviceIds:string, @queryParam('expandComponents') components: string,
        @queryParam('attributes') attributes:string, @queryParam('includeGroups') groups: string,
        @request() req:Request, @response() res: Response) : Promise<DeviceResourceList> {

        logger.info(`bulkdevices.controller  bulkGetDevices: in: deviceIds:${deviceIds}, components:${components}, attributes:${attributes}, groups:${groups}`);
        try {
            const deviceIdsAsArray = deviceIds.split(',');
            const expandComponents = (components==='true');
            const includeGroups = (groups!=='false');

            let attributesArray:string[];
            if (attributes!==undefined) {
                if(attributes==='') {
                    attributesArray=[];
                } else {
                    attributesArray=attributes.split(',');
                }
            }

            const items = await this.devicesService.getBulk(deviceIdsAsArray, expandComponents, attributesArray, includeGroups);
            const resources = this.devicesAssembler.toDeviceResourceList(items, req['version']);
            res.status(200);
            return resources;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

}
