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
import { Artifact, CdfProvisioningParameters } from "../cores/cores.models";
import { DeviceTaskStatus } from "../deviceTasks/deviceTasks.model";

export interface DeviceResource {
    name: string;
    createdAt: Date;
    updatedAt?: Date;
    taskStatus?: DeviceTaskStatus;
    statusMessage?: string;
    coreName: string;
    provisioningTemplate: string;
    provisioningParameters: { [key: string]: string };
    cdfProvisioningParameters: CdfProvisioningParameters;
    artifacts?: {
        [key: string]: Artifact
    };
}

export interface DeviceItem {
    name: string;

    provisioningTemplate: string;
    provisioningParameters?: { [key: string]: string };
    cdfProvisioningParameters?: CdfProvisioningParameters;
    coreName?: string;

    taskStatus?: DeviceTaskStatus;
    statusMessage?: string;

    artifacts?: {
        [key: string]: Artifact
    };

    createdAt?: Date;
    updatedAt?: Date;
}

export const DevicesEvent = 'Devices Resource Changes'

export type DeviceEventPayload = {
    taskId: string,
    deviceName: string,
    operation: 'create' | 'delete'
    status: 'success' | 'failed'
    errorMessage?: string
}
