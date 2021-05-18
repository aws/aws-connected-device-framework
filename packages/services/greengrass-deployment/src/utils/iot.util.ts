/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
