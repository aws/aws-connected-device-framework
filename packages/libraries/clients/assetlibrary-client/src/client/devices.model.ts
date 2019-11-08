/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DirectionStringToArrayMap, StringToArrayMap } from './common.model';

/**
 * Connected Device Framework: Dashboard Facade
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
