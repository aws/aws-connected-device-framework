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

import { logger } from '@awssolutions/simple-cdf-logger';
import AWS from 'aws-sdk';
import ow from 'ow';
import { TYPES } from '../di/types';
import { CustomResource } from './customResource';
import { CustomResourceEvent } from './customResource.model';

@injectable()
export class IotThingTypeCustomResource implements CustomResource {
    private _iot: AWS.Iot;

    constructor(@inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        this._iot = iotFactory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `IotThingTypeCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );

        const thingTypeName = customResourceEvent.ResourceProperties.ThingTypeName;

        ow(thingTypeName, ow.string.nonEmpty);

        const params: AWS.Iot.Types.CreateThingTypeRequest = {
            thingTypeName,
        };
        const result: AWS.Iot.Types.CreateThingTypeResponse = await this._iot
            .createThingType(params)
            .promise();
        logger.debug(`IotThingTypeCustomResource: create: exit: ${JSON.stringify(result)}`);
        return result;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `IotThingTypeCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }
}
