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

import { TypeCategory } from '../types/constants';
import { ModelAttributeValue, StringToArrayMap, DirectionStringToArrayMap } from '../data/model';
export class DeviceBaseResource {
	deviceId: string;
	category: TypeCategory;
	templateId: string;
	awsIotThingArn?: string;
	description?: string;
	imageUrl?: string;
	connected?: boolean;
	state?: DeviceState;

	assemblyOf?: DeviceBaseResource;
	components?: DeviceBaseResource[];

	attributes?: { [key: string] : ModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

	// populated for related resources
	relation?: string;
	direction?: string;

}
export class Device10Resource extends DeviceBaseResource {
	groups?: StringToArrayMap = {};
	devices?: StringToArrayMap = {};
}

export class Device20Resource extends DeviceBaseResource {
	groups?: DirectionStringToArrayMap = {};

	devices?: DirectionStringToArrayMap = {};
}

export class DeviceResourceList {
	results: DeviceBaseResource[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class BulkDevicesResource {
    devices: DeviceBaseResource[];
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

export class DeviceItem {
	deviceId: string;
	category: TypeCategory;
	templateId: string;
	awsIotThingArn?: string;
	description?: string;
	imageUrl?: string;
	connected?: boolean;
	state?: DeviceState;

	assemblyOf?: DeviceItem;
	components?: DeviceItem[];

	attributes?: { [key: string] : ModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

	// populated for related resources
	relation?: string;
	direction?: string;

	groups?: DirectionStringToArrayMap = {};

	devices?: DirectionStringToArrayMap = {};

	public constructor(init?:Partial<DeviceItem>) {
        Object.assign(this, init);
    }

	public listRelatedGroupPaths():string[] {
		const relatedGroupPaths:string[]= [];
		if (this.groups) {
			if (this.groups.in) {
				Object.keys(this.groups.in).forEach(k=> relatedGroupPaths.push(...this.groups.in[k]));
			}
			if (this.groups.out) {
				Object.keys(this.groups.out).forEach(k=> relatedGroupPaths.push(...this.groups.out[k]));
			}
		}
		return relatedGroupPaths;
	}

	public listRelatedDeviceIds():string[] {
		const relatedDeviceIds:string[]= [];
		if (this.devices) {
			if (this.devices.in) {
				Object.keys(this.devices.in).forEach(k=> relatedDeviceIds.push(...this.devices.in[k]));
			}
			if (this.devices.out) {
				Object.keys(this.devices.out).forEach(k=> relatedDeviceIds.push(...this.devices.out[k]));
			}
		}
		return relatedDeviceIds;
	}

}

export class DeviceItemList {
	results: DeviceItem[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export function determineIfDevice20Resource(toBeDetermined: DeviceBaseResource): toBeDetermined is Device20Resource {
	const asV2 = toBeDetermined as Device20Resource;
	if (asV2.groups?.in || asV2.groups?.out || asV2.devices?.in || asV2.devices?.out) {
		return true;
	}
	return false;
}

export function determineIfDeviceItem(toBeDetermined: any): toBeDetermined is DeviceItem {
	const asV2 = toBeDetermined as DeviceItem;
	if (asV2.deviceId) {
		return true;
	}
	return false;
}
