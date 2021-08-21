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

import { Pagination } from '../common/common.models';
import { GreengrassSubscriptionResource, GreengrassSubscriptionItem } from '../subscriptions/subscriptions.models';

export class DeviceResource {
	thingName: string;
	type: GreengrassDeviceType;
	provisioningTemplate: string;

	// this was originally released with a spelling error. both versions supported for backwards compatability
	// for device creation. the assembler will translate to correct spelling.
	provisoningParameters?: {[key : string] : string};
	provisioningParameters?: {[key : string] : string};

	cdfProvisioningParameters?: CdfProvisioningParameters;
	syncShadow = true;
	artifacts?:  {[key : string] : string};
	subscriptions?: GreengrassSubscriptionResource[];
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeviceResourceList {
	devices: DeviceResource[] = [];
	pagination?: Pagination;
}

export class DeviceItem {
	thingName: string;
	type: GreengrassDeviceType;
	provisioningTemplate: string;
	provisioningParameters?: {[key : string] : string};
	cdfProvisioningParameters?: CdfProvisioningParameters;
	syncShadow?: boolean = true;
	artifacts?:  {
		[key : string] : {
			bucket:string;
			key:string;
			createdAt?: Date;
		}
	};
	subscriptions?: GreengrassSubscriptionItem[];
	deployed?: boolean;
	createdAt?: Date;
	updatedAt?: Date;

	tasks?: DeviceTaskSummary[];
}

export interface CdfProvisioningParameters {
	caId?: string;
	certInfo?: {
		commonName?: string;
		organization?: string;
		organizationalUnit?: string;
		locality?: string;
		stateName?: string;
		country?: string;
		emailAddress?: string;
		daysExpiry?:number;
	};
}

export class DeviceItemList {
	devices: DeviceItem[] = [];
	pagination?: Pagination;
}

export class DeviceTaskItem extends DeviceItem {
	status:DeviceTaskStatus;
	statusMessage?:string;
}

export interface ProvisionThingRequest {
    provisioningTemplateId:string;
	parameters: {[key:string]:string};
}

export class DeviceTaskSummary {
	taskId:string;
	groupName:string;
	status:DeviceTaskStatus;
	statusMessage?:string;
	devices?:DeviceTaskItem[] = [];
	createdAt?: Date;
	updatedAt?: Date;
}

export type GreengrassDeviceType = 'core'|'device';

export type DeviceTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';
