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
