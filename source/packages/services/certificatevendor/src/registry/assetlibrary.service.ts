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
import { injectable, inject } from 'inversify';
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import {
    DevicesService,
    Device10Resource,
    ASSETLIBRARY_CLIENT_TYPES,
} from '@awssolutions/cdf-assetlibrary-client';
import { RegistryManager } from './registry.interfaces';

@injectable()
export class AssetLibraryRegistryManager implements RegistryManager {

    constructor(
        @inject('defaults.device.status.success.key') private successStatusKey: string,
        @inject('defaults.device.status.success.value') private successStatusValue: string,
        @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService) private devices:DevicesService) {}

    public async isWhitelisted(deviceId:string, _attributes?:{ [key: string] : string | number | boolean }) : Promise<boolean> {
        logger.debug(`registry.assetLibrary isWhitelisted: in: deviceId:${deviceId}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        let whitelisted = false;

        try {
            const device = await this.devices.getDeviceByID(deviceId);
            whitelisted = (device!==undefined);
        } catch (err) {
            logger.debug(`registry.assetLibrary isWhitelisted: err:${err}`);
            if (err.message==='Not Found') {
                return false;
            } else {
                throw new Error('UNABLE_TO_CHECK_WHITELIST');
            }
        }

        // TODO: any other checks we need to do here as part of whitelist?

        logger.debug(`certificates.service isWhitelisted: exit:${whitelisted}`);
        return whitelisted;
    }

    public async updateAssetStatus(deviceId:string) : Promise<void> {
        logger.debug(`certificates.service updateAssetStatus: in: deviceId:${deviceId}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        if (this.successStatusKey===undefined || this.successStatusKey === null) {
            logger.warn('certificates.service updateAssetStatus: exit: successStatusKey not set, therefore not updating asset library');
            return;
        }

        if (this.successStatusValue===undefined || this.successStatusValue === null) {
            logger.warn('certificates.service updateAssetStatus: exit: successStatusValue not set, therefore not updating asset library');
            return;
        }

        const device:Device10Resource = {
            attributes: {
            }
        };
        device.attributes[this.successStatusKey] = this.successStatusValue;

        try {
            await this.devices.updateDevice(deviceId, device);
        } catch (err) {
            logger.debug(`certificates.service updateAssetStatus: err:${err}`);
            throw new Error('UNABLE_TO_UPDATE_ASSET_STATUS');
        }

        logger.debug('certificates.service updateAssetStatus: exit:');
    }

}
