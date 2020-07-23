import { GreengrassSubscription } from './subscriptions.model';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export class Device {
	thingName: string;
	type: GreengrassDeviceType;
	provisioningTemplate: string;
	provisoningParameters: {[key : string] : string};
	cdfProvisioningParameters?: CdfProvisioningParameters;
	syncShadow: boolean = true;
	artifacts?:  {[key : string] : string};
	subscriptions?: GreengrassSubscription[];
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeviceTask extends Device {
	status:DeviceTaskStatus;
	statusMessage?:string;
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

export type GreengrassDeviceType = 'core'|'device';

export class DeviceTaskSummary {
	taskId:string;
	groupName:string;
	status:DeviceTaskStatus;
	statusMessage?:string;
	devices?:DeviceTask[] = [];
	createdAt?: Date;
	updatedAt?: Date;
}

export type DeviceTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';
