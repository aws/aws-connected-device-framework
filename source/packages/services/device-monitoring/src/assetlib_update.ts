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
import 'reflect-metadata';

import {
    ASSETLIBRARY_CLIENT_TYPES,
    Device10Resource,
    DevicesService,
} from '@awssolutions/cdf-assetlibrary-client';
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';

@injectable()
export class AssetLibUpdate {
    constructor(
        @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService) private readonly devices: DevicesService
    ) {}

    public async updateDeviceConnected(deviceId: string, connected: boolean): Promise<void> {
        logger.debug(
            `assetlib_update: updatedevice: in: deviceId:${deviceId}, connected:${connected}`
        );

        // update device status to active
        logger.debug('Set device status to connected or disconnected');

        const updateRequest = {
            deviceId,
            connected,
        } as Device10Resource;

        try {
            await this.devices.updateDevice(deviceId, updateRequest);
        } catch (err) {
            logger.error(err);
        }

        logger.debug('assetlib_update: updatedevice: exit:');
    }
}
