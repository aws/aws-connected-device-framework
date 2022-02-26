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
import { RequestHeaders } from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { DevicesService, DevicesServiceBase } from './devices.service';
import { Device, DeviceTask, NewDeviceTask } from './devices.model';

@injectable()
export class DevicesLambdaService extends DevicesServiceBase implements DevicesService {

    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.GREENGRASS2PROVISIONING_API_FUNCTION_NAME;
    }

    async createDeviceTask(task: NewDeviceTask, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(task, ow.object.nonEmpty);
        ow(task.type, ow.string.oneOf(['Create', 'Delete']));
        ow(task.devices, 'devices', ow.array.nonEmpty);
        
        for (const c of task.devices) {
            ow(c.name, 'client device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'client device provisioning template', ow.string.nonEmpty);
        }

        if (task.type === 'Delete') {
            ow(task.options, 'delete client device options', ow.object.nonEmpty);
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceTasksRelativeUrl(task.coreName))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(task);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res?.header['x-taskid'];

    }

    async getDeviceTask(name: string, additionalHeaders?: RequestHeaders): Promise<DeviceTask> {
        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceTaskRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders))

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }

    async getDevice(name: string, additionalHeaders?: RequestHeaders): Promise<Device> {
        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders))

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }


    async deleteDevice(name: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(name))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders))

        await this.lambdaInvoker.invoke(this.functionName, event);
    }


}
