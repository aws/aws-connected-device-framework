import { TypeCategory } from '../types/constants';

/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export type DeviceModelAttributeValue = string | number | boolean;
export class DeviceModel {
	deviceId: string;
	category: TypeCategory;
	templateId: string;
	awsIotThingArn?: string;
	description?: string;
	imageUrl?: string;
	connected?: boolean;
	state?: DeviceState;

	groups?: { [key: string] : string[]} = {};
	devices?: { [key: string] : string[]} = {};

	assemblyOf?: DeviceModel;
	components?: DeviceModel[];

	attributes?: { [key: string] : DeviceModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

}
export class DeviceListResult {
	results: DeviceModel[];
}

export class BulkDevicesRequest {
    devices: DeviceModel[];
}

export class BulkDevicesResult {
    success: number;
    failed: number;
    total: number;
    errors: {[key:string]:string};
}

export enum DeviceState {
	unprovisioned = 'unprovisioned',
	active = 'active',
	decommissoned = 'decommissioned',
	retired = 'retired'
}
