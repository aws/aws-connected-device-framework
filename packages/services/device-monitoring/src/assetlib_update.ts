/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import 'reflect-metadata';
import { DevicesService, Device } from '@cdf/assetlibrary-client';
import { logger } from './utils/logger';

export class AssetLibUpdate {

    private devices: DevicesService;

    constructor(   ) {
        this.devices = new DevicesService();
    }

    public async updateDeviceConnected(deviceId: string, connected:boolean) : Promise<void> {
        logger.debug(`assetlib_update: updatedevice: in: deviceId:${deviceId}, connected:${connected}`);

        // update device status to active
        logger.debug('Set device status to connected or disconnected');

        const  updateRequest = {
            deviceId,
            connected
        } as Device;
        await this.devices.updateDevice(deviceId, updateRequest);

        logger.debug('assetlib_update: updatedevice: exit:');
    }
}
