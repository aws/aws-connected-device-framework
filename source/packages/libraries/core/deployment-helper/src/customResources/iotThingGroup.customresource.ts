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


import {inject, injectable} from 'inversify';

import {TYPES} from '../di/types';
import {CustomResourceEvent} from './customResource.model';
import {CustomResource} from './customResource';
import ow from 'ow';
import { logger } from '../utils/logger';
import AWS from 'aws-sdk'

interface IotThingGroupCustomResourceOutput{
     thingGroupName?: string;
     thingGroupId?: string;
     thingGroupArn?: string;
}

@injectable()
export class IotThingGroupCustomResource implements CustomResource {

    private _iot: AWS.Iot;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    ) {
        this._iot = iotFactory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<IotThingGroupCustomResourceOutput> {
        const thingGroupName = customResourceEvent?.ResourceProperties?.ThingGroupName;
        ow(thingGroupName, ow.string.nonEmpty);
        try {
            const describeThingGroupResponse = await this._iot.describeThingGroup({thingGroupName}).promise();
            logger.info(`IotThingGroupCustomResource: create: thing group ${describeThingGroupResponse.thingGroupName} exist`);
            return describeThingGroupResponse
        } catch (e) {
            if (e.code === 'ResourceNotFoundException') {
                logger.info(`IotThingGroupCustomResource: create: creating new thing group ${thingGroupName}`)
                const params: AWS.Iot.Types.CreateThingGroupRequest = {
                    thingGroupName
                };
                const createThingGroupResponse = await this._iot.createThingGroup(params).promise();
                return createThingGroupResponse;
            } else {
                logger.error(`IotThingGroupCustomResource: create: error when querying thing group ${JSON.stringify(e)}`)
            }
        }
        return { }
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<IotThingGroupCustomResourceOutput> {
        const thingGroupName = customResourceEvent?.ResourceProperties?.ThingGroupName;
        ow(thingGroupName, ow.string.nonEmpty);
        const describeThingGroupResponse = await this._iot.describeThingGroup({thingGroupName}).promise()
        return describeThingGroupResponse;
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const thingGroupName = customResourceEvent?.ResourceProperties?.ThingGroupName;
        ow(thingGroupName, ow.string.nonEmpty);
        logger.warn(`IotThingGroupCustomResource: delete: the thing group ${thingGroupName} need to be deleted manually `)
        return {};
    }
}

