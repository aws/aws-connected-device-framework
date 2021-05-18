/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export interface DeploymentSource {
	type: DeploymentSourceType;
	bucket: string;
	prefix: string;
}

export enum DeploymentSourceType {
	S3='s3',
}

export enum DeploymentTemplateType {
	AGENTLESS='agentless',
	AGENTBASED='agentbased',
}

export class DeploymentTemplate {
	createdAt?: Date;
	description: string;
	enabled?: boolean;
	envVars?: string[];
	name: string;
	options?: string[];
	source: DeploymentSource;
	type: DeploymentTemplateType;
	updatedAt?: Date;
	versionNo?: number;
}

export class DeploymentTemplateList {
	templates: DeploymentTemplate[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
