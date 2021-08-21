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
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { DevicesAssembler } from './devices.assembler';
import {DeviceItem, DeviceResourceList, DeviceTaskSummary} from './devices.models';
import { DevicesService } from './devices.service';

@controller('')
export class DevicesController implements interfaces.Controller {

    constructor( @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler) {}

    @httpPost('/groups/:name/deviceTasks')
    public async associateDevicesWithGroup(@requestParam('name') name: string, @requestBody() devices:DeviceResourceList, @response() res:Response) : Promise<DeviceTaskSummary> {
        logger.info(`devices.controller associateDevicesWithGroup: in: name:${name}, devices:${JSON.stringify(devices)}`);

        let taskSummary:DeviceTaskSummary;

        try {
            const items = this.devicesAssembler.fromResourceList(devices);
            taskSummary = await this.devicesService.createDeviceAssociationTask(name, items.devices);

            res.location(`/groups/${name}/deviceTasks/${taskSummary.taskId}`);
            res.status(202);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`devices.controller associateDevicesWithGroup: exit: ${JSON.stringify(taskSummary)}`);
        return taskSummary;
    }

    @httpGet('/groups/:name/deviceTasks/:taskId')
    public async getDeviceAssociationTask(@requestParam('name') name: string, @requestParam('taskId') taskId: string,
    @response() res: Response): Promise<DeviceTaskSummary> {

        logger.debug(`devices.controller getDeviceAssociationTask: in: name:${name}, taskId:${taskId}`);

        let taskInfo: DeviceTaskSummary;
        try {
            taskInfo = await this.devicesService.getDeviceAssociationTask(name, taskId);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`devices.controller getDeviceAssociationTask: exit: ${JSON.stringify(taskInfo)}`);
        return taskInfo;
    }

    @httpGet('/devices/:deviceId')
    public async getDevice(@requestParam('deviceId') deviceId: string, @response() res: Response): Promise<DeviceItem> {

        logger.debug(`devices.controller getDevice: in: deviceId:${deviceId}`);

        let device: DeviceItem;
        try {
            device = await this.devicesService.getDevice(deviceId);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`devices.controller getDevice: exit: ${JSON.stringify(device)}`);
        return device;
    }

}
