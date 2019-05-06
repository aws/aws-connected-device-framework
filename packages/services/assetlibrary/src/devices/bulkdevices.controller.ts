/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpPatch, httpGet, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { BulkDevicesRequest, BulkDevicesResult, DeviceListResult } from './devices.models';
import { DevicesService } from './devices.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';

@controller('/bulkdevices')
export class BulkDevicesController implements interfaces.Controller {

    constructor( @inject(TYPES.DevicesService) private devicesService: DevicesService) {}

    @httpPost('')
    public async bulkCreateDevices(@requestBody() devices: BulkDevicesRequest, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.info(`bulkdevices.controller  bulkCreateDevices: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);
        try {
            const result = await this.devicesService.createBulk(devices, applyProfile);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPatch('')
    public async bulkUpdateDevices(@requestBody() devices: BulkDevicesRequest, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkDevicesResult> {
        logger.info(`bulkdevices.controller  bulkUpdateDevices: in: devices: ${JSON.stringify(devices)}, applyProfile:${applyProfile}`);
        try {
            const result = await this.devicesService.updateBulk(devices, applyProfile);
            res.status(204);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpGet('')
    public async bulkGetDevices(@queryParam('deviceIds') deviceIds:string, @queryParam('includeComponents') components: string,
    @queryParam('attributes') attributes:string, @queryParam('includeGroups') groups: string, @response() res: Response) : Promise<DeviceListResult> {
        logger.info(`bulkdevices.controller  bulkGetDevices: in: deviceIds:${deviceIds}, components:${components}, attributes:${attributes}, groups:${groups}`);
        try {
            const deviceIdsAsArray = deviceIds.split(',');
            const includeComponents = (components==='true');
            const includeGroups = (groups!=='false');

            let attributesArray:string[];
            if (attributes!==undefined) {
                if(attributes==='') {
                    attributesArray=[];
                } else {
                    attributesArray=attributes.split(',');
                }
            }

            const result = await this.devicesService.getBulk(deviceIdsAsArray, includeComponents, attributesArray, includeGroups);
            res.status(200);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

}
