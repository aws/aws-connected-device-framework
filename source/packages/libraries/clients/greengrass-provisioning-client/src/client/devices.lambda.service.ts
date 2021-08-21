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
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { DevicesServiceBase, DevicesService } from './devices.service';
import { Device, DeviceTaskSummary } from './devices.model';

@injectable()
export class DevicesLambdaService extends DevicesServiceBase implements DevicesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassProvisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async associateDevicesWithGroup(groupName:string, devices:Device[], additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary> {

        ow(groupName, ow.string.nonEmpty);
        ow(devices, ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceTasksRelativeUrl(groupName))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({devices});

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getDeviceAssociationTask(groupName:string, taskId: string, additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary> {
        ow(groupName, ow.string.nonEmpty);
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceTaskRelativeUrl(groupName, taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

}
