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
import { injectable } from 'inversify';
import { logger } from '@awssolutions/simple-cdf-logger';
import { RegistryManager } from './registry.interfaces';

@injectable()
export class DoNothingRegistryManager implements RegistryManager {
    public async isWhitelisted(deviceId: string): Promise<boolean> {
        logger.debug(`donothing.service isWhitelisted: in: deviceId:${deviceId}`);

        const whitelisted = true;

        logger.debug(`donothing.service isWhitelisted: exit:${whitelisted}`);
        return whitelisted;
    }

    public async updateAssetStatus(deviceId: string): Promise<void> {
        logger.debug(`donothing.service updateAssetStatus: in: deviceId:${deviceId}`);

        // intentionally doing nothing

        logger.debug('donothing.service updateAssetStatus: exit:');
    }
}
