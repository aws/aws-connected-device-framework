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
import { DeviceItem, DeviceResource } from "../devices/devices.model";

export interface NewDeviceTaskResource {
    coreName: string;
    devices: DeviceResource[];
    type: DeviceTaskType;
    options: DeleteDeviceTaskOptions;
}

export interface DeleteDeviceTaskOptions {
    deprovisionClientDevices: boolean;
}

export interface DeviceTaskResource {
    id: string;
    coreName: string;
    devices: DeviceResource[];
    taskStatus: DeviceTaskStatus;
    type: DeviceTaskType;
    options?: DeleteDeviceTaskOptions;
    statusMessage?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface DeviceTaskItem {
    id?: string;
    coreName: string;
    options?: DeleteDeviceTaskOptions;
    devices: DeviceItem[];
    taskStatus?: DeviceTaskStatus;
    statusMessage?: string;
    createdAt?: Date;
    updatedAt?: Date;
    type: DeviceTaskType;
    // no. of batches the task has been split into
    batchesTotal?: number;
    // no. of batches reporting as complete, regardless of whether success or not
    batchesComplete?: number;
}

export type DeviceTaskStatus = 'Waiting' | 'InProgress' | 'Success' | 'Failure';

export type DeviceTaskType = 'Delete' | 'Create';