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
import { DeploymentType } from './templates.model' 

export class DeploymentTaskRequest {
	deployments: CreateDeploymentRequest[]
}

export class DeploymentTaskResponse {
	taskId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateDeploymentRequest {
	deviceId: string;
	deploymentTemplateName: string;
	deploymentType?: DeploymentType;
	extraVars?: { [key: string]: string}
}

export interface UpdateDeploymentRequest {
	deploymentId: string,
	deploymentStatus?: string,
	extraVars?: { [key: string]: string}
}

export interface DeploymentResponse {
	taskId?: string;
	deviceId: string;
	deploymentId: string;
	deploymentTemplateName?: string;
	deploymentStatus?: DeploymentStatus;
	createdAt?: Date;
	updatedAt?: Date;
	deploymentType?: DeploymentType;
	statusMessage?: string;
	associationId?: string;
	extraVars?: { [key: string]: string}
}


export enum DeploymentStatus {
	RETRY='retry',
	CREATED='created',
	PENDING='pending',
	SUCCEESS='success',
	FAILED='failed'
}

export class ListDeploymentsResponse {
	deployments: DeploymentResponse[];
	pagination?: {
		lastEvaluated?: DeploymentListPaginationKey,
		count?:number,
	};
}

export declare type DeploymentListPaginationKey = {
	nextToken: string;
}
