/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import ow from 'ow';
import { DevicesService, Device10Resource, ASSTLIBRARY_CLIENT_TYPES } from '@cdf/assetlibrary-client';
import { RegistryManager } from './registry.interfaces';

@injectable()
export class AssetLibraryRegistryManager implements RegistryManager {

    constructor(
        @inject('defaults.device.status.success.key') private successStatusKey: string,
        @inject('defaults.device.status.success.value') private successStatusValue: string,
        @inject(ASSTLIBRARY_CLIENT_TYPES.DevicesService) private devices:DevicesService) {}

    public async isWhitelisted(deviceId:string, _attributes?:{ [key: string] : string | number | boolean }) : Promise<boolean> {
        logger.debug(`certificates.service isWhitelisted: in: deviceId:${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        let whitelisted = false;

        try {
            const device = await this.devices.getDeviceByID(deviceId);
            whitelisted = (device!==undefined);
        } catch (err) {
            logger.debug(`certificates.service isWhitelisted: err:${err}`);
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

        ow(deviceId, ow.string.nonEmpty);

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
