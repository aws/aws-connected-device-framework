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
/* tslint:disable:no-unused-variable member-ordering */

import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { RequestHeaders } from './common.model';
import { Device, DeviceTask, NewDeviceTask } from './devices.model';
import { DevicesService, DevicesServiceBase } from './devices.service';

@injectable()
export class DevicesApigwService extends DevicesServiceBase implements DevicesService {

    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASS2PROVISIONING_BASE_URL;
    }

    async createDeviceTask(task: NewDeviceTask, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(task, ow.object.nonEmpty);
        ow(task.devices, 'devices', ow.array.nonEmpty);
        ow(task.devices, 'devices', ow.array.nonEmpty);

        for (const c of task.devices) {
            ow(c.name, 'client device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'client device provisioning template', ow.string.nonEmpty);
        }

        if (task.type === 'Delete') {
            ow(task.options, 'delete client device options', ow.object.nonEmpty);
        }

        const url = `${this.baseUrl}${super.deviceTasksRelativeUrl(task.coreName)}`;

        const r = await request.post(url)
            .send(task)
            .set(this.buildHeaders(additionalHeaders));

        return r.header['x-taskid'];

    }

    async getDeviceTask(name: string, additionalHeaders?: RequestHeaders): Promise<DeviceTask> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceTaskRelativeUrl(name)}`;

        const r = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return r.body;
    }


    async getDevice(name: string, additionalHeaders?: RequestHeaders): Promise<Device> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceRelativeUrl(name)}`;

        const r = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return r.body;

    }

    async deleteDevice(name: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceRelativeUrl(name)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));

    }

}
