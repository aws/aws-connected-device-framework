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
import { inject, injectable } from 'inversify';

import { DevicesAssembler } from '../devices/devices.assembler';
import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { DeviceTaskItem, DeviceTaskResource, NewDeviceTaskResource } from './deviceTasks.model';

@injectable()
export class DeviceTasksAssembler {

    constructor(
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler) { }

    public toResource(item: DeviceTaskItem): DeviceTaskResource {
        logger.debug(`coreTasks.assembler toResource: in: item:${JSON.stringify(item)}`);

        const resource: DeviceTaskResource = {
            id: item.id,
            coreName: item.coreName,
            devices: this.devicesAssembler.toResourceArray(item.devices),
            taskStatus: item.taskStatus,
            statusMessage: item.statusMessage,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            type: item.type,
            options: item.options
        }

        logger.debug(`coreTasks.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toItem(resource: NewDeviceTaskResource): DeviceTaskItem {
        logger.debug(`coreTasks.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item: DeviceTaskItem = {
            devices: resource.devices,
            coreName: resource.coreName,
            type: resource.type,
            options: resource.options
        }

        logger.debug(`coreTasks.assembler toItem: exit:${JSON.stringify(item)}`);
        return item;
    }
}