/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import { RegistryManager } from './registry.interfaces';

@injectable()
export class DoNothingRegistryManager implements RegistryManager {

    public async isWhitelisted(deviceId:string) : Promise<boolean> {
        logger.debug(`donothing.service isWhitelisted: in: deviceId:${deviceId}`);

        const whitelisted=true;

        logger.debug(`donothing.service isWhitelisted: exit:${whitelisted}`);
        return whitelisted;
    }

    public async updateAssetStatus(deviceId:string) : Promise<void> {
        logger.debug(`donothing.service updateAssetStatus: in: deviceId:${deviceId}`);

        // intentionally doing nothing

        logger.debug('donothing.service updateAssetStatus: exit:');
    }

}
