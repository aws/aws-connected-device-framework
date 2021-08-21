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
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

@injectable()
export class IotUtil {
    private iot: AWS.Iot;

    public constructor(
        @inject(TYPES.IOTFactory) iotFactory: () => AWS.Iot
    ) {
        this.iot = iotFactory();
    }

    public async deviceExistsInRegistry(thingName: string): Promise<boolean> {
        logger.debug(`iot.util doesThingExist: in: thingName: ${thingName}`);

        try {
            await this.iot.describeThing({
                thingName
            }).promise();
            return true
        } catch (e) {
            return false;
        }
    }
}
