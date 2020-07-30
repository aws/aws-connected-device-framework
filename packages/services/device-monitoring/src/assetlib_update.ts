/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { DevicesService, Device10Resource, ASSTLIBRARY_CLIENT_TYPES } from '@cdf/assetlibrary-client';
import { logger } from './utils/logger';

@injectable()
export class AssetLibUpdate {

    constructor(
        @inject(ASSTLIBRARY_CLIENT_TYPES.DevicesService) private readonly devices:DevicesService
    ) {}

    public async updateDeviceConnected(deviceId: string, connected:boolean) : Promise<void> {
        logger.debug(`assetlib_update: updatedevice: in: deviceId:${deviceId}, connected:${connected}`);

        // update device status to active
        logger.debug('Set device status to connected or disconnected');

        const  updateRequest = {
            deviceId,
            connected
        } as Device10Resource;

        try {
            await this.devices.updateDevice(deviceId, updateRequest);
        } catch (err) {
            logger.error(err);
        }

        logger.debug('assetlib_update: updatedevice: exit:');
    }
}
