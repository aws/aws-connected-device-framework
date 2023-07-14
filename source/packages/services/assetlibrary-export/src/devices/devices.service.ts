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
import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';

import { DevicesAssembler } from './devices.assembler';
import { DevicesDao } from './devices.dao';
import { DeviceItemList } from './devices.models';

@injectable()
export class DevicesService {
    constructor(
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDao,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
    ) {}

    public async getBulk(
        deviceIds: string[],
        expandComponents: boolean,
        attributes: string[],
        includeGroups: boolean,
    ): Promise<DeviceItemList> {
        logger.debug(
            `device.service getBulk: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}}`,
        );

        ow(deviceIds, ow.array.nonEmpty);

        deviceIds = deviceIds.map((d) => d.toLowerCase());

        const result = await this.devicesDao.get(
            deviceIds,
            expandComponents,
            attributes,
            includeGroups,
        );

        const model = this.devicesAssembler.toDeviceItems(result);
        logger.debug(`device.service get: exit: model: ${JSON.stringify(model)}`);
        return { results: model };
    }
}
