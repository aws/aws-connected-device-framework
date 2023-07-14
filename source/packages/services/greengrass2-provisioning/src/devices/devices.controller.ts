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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    interfaces,
    queryParam,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors.util';
import { DevicesAssembler } from './devices.assembler';
import { DevicesService } from './devices.service';

@controller('/devices')
export class DevicesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler
    ) {}

    @httpGet('/:name')
    public async getDevice(
        @requestParam('name') name: string,
        @response() res: Response
    ): Promise<void> {
        logger.info(`devices.controller getCore: in: name:${name}`);

        try {
            const item = await this.devicesService.get(name);
            if (item === undefined) {
                logger.debug(`devices.controller getCore: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.devicesAssembler.toResource(item);
                logger.debug(`devices.controller getCore: exit: ${JSON.stringify(resource)}`);
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:name')
    public async deleteDevice(
        @requestParam('name') name: string,
        @queryParam('deprovision') deprovision = true,
        @queryParam('disassociateDeviceFromCore') disassociateDeviceFromCore = true,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `devices.controller deleteDevice: in: name:${name}, deprovision:${deprovision}, disassociateDeviceFromCore:${disassociateDeviceFromCore}`
        );

        try {
            await this.devicesService.deleteDevice(name, deprovision, disassociateDeviceFromCore);
        } catch (e) {
            handleError(e, res);
        }
    }
}
