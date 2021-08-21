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
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import {logger} from '../../utils/logger.util';
import {TYPES} from '../../di/types';
import ow from 'ow';

@injectable()
export class GetThingHandler extends AbstractDeviceAssociationHandler {

    private iot: AWS.Iot;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        super();
        this.iot = iotFactory();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`getThing.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo, ow.object.nonEmpty);
        ow(request.taskInfo.devices, ow.array);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        if (request.things===undefined) {
            request.things= {};
        }

        for (const device of request.taskInfo.devices) {

            ow(device.thingName, ow.string.nonEmpty);

            const thing = request.things[device.thingName];

            if (thing===undefined) {
                request.things[device.thingName] = await this.getThing(device.thingName);
            }

        }

        logger.debug(`getThing.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

    private async getThing(deviceId: string) : Promise<AWS.Iot.DescribeThingResponse> {
        logger.debug(`getThing.handler handle: in: deviceId:${deviceId}`);

        let thingInfo: AWS.Iot.DescribeThingResponse;
        try {
            const req:AWS.Iot.DescribeThingRequest = {
                thingName: deviceId
            };
            logger.debug(`getThing.handler handle: describeThing: req: ${JSON.stringify(req)}`);
            thingInfo = await this.iot.describeThing(req).promise();
            logger.debug(`getThing.handler handle: describeThing: thingInfo: ${JSON.stringify(thingInfo)}`);
        } catch (err) {
            if (err.code !== 'ResourceNotFoundException') {
                logger.error(`getThing.handler handle: err: ${err}`);
                throw err;
            }
        }

        logger.debug(`getThing.handler handle: exit: ${JSON.stringify(thingInfo)}`);
        return thingInfo;
    }

}
