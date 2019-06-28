import { TypeCategory } from '../types/constants';
import { ModelAttributeValue } from '../data/model';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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

	attributes?: { [key: string] : ModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

}

export class RelatedDeviceModel extends DeviceModel {
	relation: string;
	direction: string;
}

export class DeviceListResult {
	results: DeviceModel[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class RelatedDeviceListResult {
	results: RelatedDeviceModel[];
	pagination?: {
		offset:number|string;
		count: number;
	};
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
