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
import { DirectionStringToArrayMap, StringToArrayMap } from './common.model';

/**
 * AWS Connected Device Framework: Dashboard Facade
 */

export interface DeviceBaseResource {
    /**
     * Globally unique id of the Device.
     */
    deviceId?: string;
    /**
     * Category, always `device` for a device.
     */
    category?: string;
    /**
     * Template of Device.
     */
    templateId?: string;
    /**
     * Description of the group.
     */
    description?: string;
    /**
     * Arn of the device if registered within the AWS IoT registry.
     */
    awsIotThingArn?: string;
    /**
     * URL of an image of the device.
     */
    imageUrl?: string;
    /**
     * Whether the device is reported as connected or not.
     */
    connected?: boolean;
    /**
     * The state of the device
     */
    state?: DeviceState;
    /**
     * Paths of the groups that this Device is associated with.
     */
    assemblyOf?: DeviceBaseResource;
    /**
     * The device components that this Device is assembled of.
     */
    components?: DeviceBaseResource[];
    attributes?: { [key: string]: string | number | boolean; };

	// populated for related resources
	relation?: string;
	direction?: string;
}

export interface Device10Resource extends DeviceBaseResource {
	groups?: StringToArrayMap;
	devices?: StringToArrayMap;
}

export interface Device20Resource extends DeviceBaseResource {
	groups?: DirectionStringToArrayMap;

	devices?: DirectionStringToArrayMap;
}

export interface BulkDevicesResource {
    devices: DeviceBaseResource[];
}

export interface DeviceResourceList {
	results: DeviceBaseResource[];
	pagination?: {
		offset:number;
		count: number;
	};
}

export enum DeviceState {
    Unprovisioned = 'unprovisioned',
    Active = 'active',
    Decommisioned = 'decommisioned',
    Retired = 'retired'
}

export interface BulkDevicesResult {
    success: number;
    failed: number;
    total: number;
    errors: {[key:string]:string};
}
