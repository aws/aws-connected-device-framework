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

import { Pagination } from "../common/common.models";

export class DeploymentTaskSummary {
	taskId:string;
	bulkDeploymentId?: string;
	bulkDeploymentStatus?: GGBulkDeploymentStatus;
	taskStatus:DeploymentTaskStatus;
	statusMessage?:string;
	deployments:DeploymentItem[] = [];
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeploymentItem {
	groupName: string;
	groupId?: string;
	groupVersionId?: string;
	bulkDeploymentId?: string;
	deploymentId?: string;
	deploymentType?: GreengrassDeploymentType;
	devices?: DeviceDeploymentItem[];
	deploymentStatus?:GGGroupDeploymentStatus;
	statusMessage?:string;
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeviceDeploymentItem {
	thingName: string;
	deploymentStatus:GGDeviceDeploymentStatus;
	statusMessage?:string;
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeploymentItemList {
	deployments: DeploymentItem[] = [];
	pagination?: Pagination;
}

export class DeploymentTaskSummaryList {
	deploymentTasks: DeploymentTaskSummary[] = [];
	pagination?: Pagination;
}

export type DeploymentTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';

export type GGBulkDeploymentStatus = 'Waiting'|'Created'|'Initializing'|'Running'|'Completed'|'Stopping'|'Stopped'|'Failed';

export type GGGroupDeploymentStatus = 'Waiting'|'Created'|'Building'|'InProgress'|'Success'|'Failure';

// TODO: implement the different statuses...
export type GGDeviceDeploymentStatus = 'Waiting';

export type GreengrassDeploymentType = 'NewDeployment'|'Redeployment'|'ResetDeployment'|'ForceResetDeployment';
