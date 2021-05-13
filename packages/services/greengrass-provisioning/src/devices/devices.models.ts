import { Pagination } from '../common/common.models';
import { GreengrassSubscriptionResource, GreengrassSubscriptionItem } from '../subscriptions/subscriptions.models';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
