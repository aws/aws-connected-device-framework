/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export interface DeploymentRequest {
	deviceId: string;
	deploymentId?: string;
	deploymentTemplateName: string;
	deploymentStatus?: DeploymentStatus;
}

export interface DeploymentResponse {
	deviceId: string;
	deploymentId: string;
	deploymentTemplateName?: string;
	deploymentStatus?: DeploymentStatus;
	createdAt?: Date;
	updatedAt?: Date;
	deploymentType?: DeploymentType;
}

export enum DeploymentType {
	AGENTLESS='agentless',
	AGENTBASED='agentbased',
}

export enum DeploymentStatus {
	RETRY='retry',
	CREATED='created',
	PENDING='pending',
	SUCCEESS='success',
	FAILED='failed'
}

export class DeploymentResponseList {
	deployments: DeploymentResponse[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
