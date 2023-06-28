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
import {logger} from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import { RegistryManager } from './registry.interfaces';
import { TYPES } from '../di/types';
import { Iot } from 'aws-sdk';

@injectable()
export class DeviceRegistryManager implements RegistryManager {

    private readonly iot: AWS.Iot;

    constructor(
        @inject('defaults.device.status.success.key') private successKey: string,
        @inject('defaults.device.status.success.value') private successValue: string,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
            this.iot = iotFactory();
    }

    public async isWhitelisted(deviceId:string) : Promise<boolean> {
        logger.debug(`deviceregistry.service isWhitelisted: in: deviceId:${deviceId}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        let whitelisted=true;

        try {
            await this.iot.describeThing({thingName:deviceId}).promise();
        } catch (err) {
            if (err.name==='ResourceNotFoundException') {
                whitelisted=false;
            } else {
                throw err;
            }
        }

        logger.debug(`deviceregistry.service isWhitelisted: exit:${whitelisted}`);
        return whitelisted;
    }

    public async updateAssetStatus(deviceId:string) : Promise<void> {
        logger.debug(`deviceregistry.service updateAssetStatus: in: deviceId:${deviceId}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        if (this.successKey===undefined || this.successKey === null) {
            logger.warn('deviceregistry.service updateAssetStatus: exit: successKey not set, therefore not updating device registry');
            return;
        }
        if (this.successValue===undefined || this.successValue === null) {
            logger.warn('deviceregistry.service updateAssetStatus: exit: successValue not set, therefore not updating device registry');
            return;
        }

        const params: Iot.Types.UpdateThingRequest = {
            thingName:deviceId,
            attributePayload: {
                attributes: {
                },
                merge: true
            }
        };
        params.attributePayload.attributes[this.successKey] = this.successValue;
        await this.iot.updateThing(params).promise();

        logger.debug('deviceregistry.service updateAssetStatus: exit:');
    }

}
