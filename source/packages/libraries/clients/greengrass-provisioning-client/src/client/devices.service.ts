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
import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { Device, DeviceTaskSummary } from './devices.model';

export interface DevicesService {

    associateDevicesWithGroup(groupName:string, devices:Device[], additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary>;

    getDeviceAssociationTask(groupName:string, taskId: string, additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary>;

}

@injectable()
export class DevicesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected deviceTasksRelativeUrl(groupName:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'deviceTasks');
    }

    protected deviceTaskRelativeUrl(groupName:string, taskId:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'deviceTasks', taskId);
    }
}
