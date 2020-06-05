/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class DeploymentTaskSummaryList {
	deploymentTasks: DeploymentTaskSummary[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export type DeploymentTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';

export type GGBulkDeploymentStatus = 'Waiting'|'Created'|'Initializing'|'Running'|'Completed'|'Stopping'|'Stopped'|'Failed';

export type GGGroupDeploymentStatus = 'Waiting'|'Created'|'Building'|'InProgress'|'Success'|'Failure';

// TODO: implement the different statuses...
export type GGDeviceDeploymentStatus = 'Waiting';

export type GreengrassDeploymentType = 'NewDeployment'|'Redeployment'|'ResetDeployment'|'ForceResetDeployment';
