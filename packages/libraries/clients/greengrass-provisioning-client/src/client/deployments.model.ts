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
	deployments:Deployment[] = [];
	createdAt?: Date;
	updatedAt?: Date;
}

export class Deployment {
	groupName: string;
	groupId?: string;
	groupVersionId?: string;
	bulkDeploymentId?: string;
	deploymentId?: string;
	deploymentType?: GreengrassDeploymentType;
	devices?: DeviceDeployment[];
	deploymentStatus?:GGGroupDeploymentStatus;
	statusMessage?:string;
	createdAt?: Date;
	updatedAt?: Date;
}

export class DeviceDeployment {
	thingName: string;
	deploymentStatus:GGDeviceDeploymentStatus;
	statusMessage?:string;
	createdAt?: Date;
	updatedAt?: Date;
}

export type GGBulkDeploymentStatus = 'Waiting'|'Created'|'Initializing'|'Running'|'Completed'|'Stopping'|'Stopped'|'Failed';

export type DeploymentTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';

export type GreengrassDeploymentType = 'NewDeployment'|'Redeployment'|'ResetDeployment'|'ForceResetDeployment';

export type GGDeviceDeploymentStatus = 'Waiting';

export type GGGroupDeploymentStatus = 'Waiting'|'Created'|'Building'|'InProgress'|'Success'|'Failure';
