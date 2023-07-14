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
import { Request, Response } from 'express';
import {
    interfaces,
    controller,
    response,
    request,
    requestBody,
    httpPost,
    httpPatch,
    httpGet,
    queryParam,
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { DevicesService } from './devices.service';
import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { InvalidQueryStringError, handleError } from '../utils/errors';
import { BulkDevicesResource, BulkDevicesResult, DeviceResourceList } from './devices.models';
import { DevicesAssembler } from './devices.assembler';

@controller('/bulkdevices')
export class BulkDevicesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
    ) {}

    @httpPost('')
    public async bulkCreateDevices(
        @requestBody() devices: BulkDevicesResource,
        @response() res: Response,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<BulkDevicesResult> {
        logger.info(
            `bulkdevices.controller  bulkCreateDevices: in: devices: ${JSON.stringify(
                devices,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            const items = this.devicesAssembler.fromBulkDevicesResource(devices);
            const result = await this.devicesService.createBulk(items, applyProfile);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPatch('')
    public async bulkUpdateDevices(
        @requestBody() devices: BulkDevicesResource,
        @response() res: Response,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<BulkDevicesResult> {
        logger.info(
            `bulkdevices.controller  bulkUpdateDevices: in: devices: ${JSON.stringify(
                devices,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            const items = this.devicesAssembler.fromBulkDevicesResource(devices);
            const result = await this.devicesService.updateBulk(items, applyProfile);
            res.status(204);
            return result;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('')
    public async bulkGetDevices(
        @queryParam('deviceIds') deviceIds: string,
        @queryParam('expandComponents') components: string,
        @queryParam('attributes') attributes: string,
        @queryParam('includeGroups') groups: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<DeviceResourceList> {
        logger.info(
            `bulkdevices.controller  bulkGetDevices: in: deviceIds:${deviceIds}, components:${components}, attributes:${attributes}, groups:${groups}`,
        );
        try {
            let deviceIdsAsArray: string[];
            if (deviceIds) {
                if (Array.isArray(deviceIds)) {
                    deviceIdsAsArray = deviceIds;
                } else if (typeof deviceIds === 'string') {
                    deviceIdsAsArray = deviceIds.split(',').filter((deviceId) => deviceId !== '');
                }
            } else {
                // throw a 400 error if no `deviceId` is provided
                const errorMessage = 'Missing required query parameter `deviceId`.';
                res.statusMessage = errorMessage;
                throw new InvalidQueryStringError(errorMessage);
            }
            // remove duplicate deviceIds if any
            deviceIdsAsArray = deviceIdsAsArray.filter(
                (item, index) => deviceIdsAsArray.indexOf(item) === index,
            );

            const expandComponents = components === 'true';
            const includeGroups = groups !== 'false';

            let attributesArray: string[];
            if (attributes) {
                if (Array.isArray(attributes)) {
                    attributesArray = attributes;
                } else if (typeof attributes === 'string') {
                    attributesArray = attributes.split(',').filter((attr) => attr !== '');
                }
            }

            const items = await this.devicesService.getBulk(
                deviceIdsAsArray,
                expandComponents,
                attributesArray,
                includeGroups,
            );
            const resources = this.devicesAssembler.toDeviceResourceList(items, req['version']);
            res.status(200);
            return resources;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }
}
