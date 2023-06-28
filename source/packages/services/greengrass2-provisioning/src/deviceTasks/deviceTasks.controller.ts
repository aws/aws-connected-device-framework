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
import { inject } from "inversify";
import { controller, httpGet, httpPost, interfaces, requestBody, requestParam, response } from "inversify-express-utils";
import { TYPES } from "../di/types";
import { DeviceTasksService } from "./deviceTasks.service";
import { Response } from 'express';
import { logger } from '@awssolutions/simple-cdf-logger';
import { handleError } from "../utils/errors.util";
import { NewDeviceTaskResource } from "./deviceTasks.model";
import { DeviceTasksAssembler } from "./deviceTasks.assembler";

@controller('')
export class DeviceTasksController implements interfaces.Controller {

    constructor(
        @inject(TYPES.DeviceTasksService) private deviceTasksService: DeviceTasksService,
        @inject(TYPES.DeviceTasksAssembler) private deviceTaskAssembler: DeviceTasksAssembler) { }

    @httpPost('/cores/:coreName/deviceTasks')
    public async createDeviceTask(@requestBody() resource: NewDeviceTaskResource, @requestParam('coreName') coreName: string, @response() res: Response): Promise<void> {
        logger.debug(`deviceTasks.controller createDeviceTask: in: resource: ${JSON.stringify(resource)}`);
        try {
            const item = this.deviceTaskAssembler.toItem(resource);
            const taskId = await this.deviceTasksService.create(item, coreName);
            logger.debug(`deviceTasks.controller createDeviceTask: exit: taskId:${JSON.stringify(taskId)}`);
            res.location(`/deviceTasks/${taskId}`)
                .header('x-taskid', taskId)
                .status(202)
                .send();
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/deviceTasks/:taskId')
    public async getDeviceTask(@requestParam('taskId') taskId: string, @response() res: Response): Promise<void> {
        logger.info(`deviceTasks.controller getDeviceTask: in: taskId:${taskId}`);

        try {
            const item = await this.deviceTasksService.get(taskId);
            if (item === undefined) {
                logger.debug(`deviceTasks.controller getDeviceTask: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.deviceTaskAssembler.toResource(item);
                logger.debug(`deviceTasks.controller getDeviceTask: exit: ${JSON.stringify(resource)}`);
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }
}