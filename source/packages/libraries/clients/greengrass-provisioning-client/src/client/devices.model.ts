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
import { GreengrassSubscription } from './subscriptions.model';

export class Device {
	thingName: string;
	type: GreengrassDeviceType;
	provisioningTemplate: string;
	provisioningParameters: {[key : string] : string};
	cdfProvisioningParameters?: CdfProvisioningParameters;
	syncShadow= true;
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
