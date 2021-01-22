/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { AbortConfig, JobExecutionsRolloutConfig, TimeoutConfig } from "../commands/commands.models";

export interface TemplateSummaryModel {
	templateId:string;
	operation:string;
	description:string;
}
export interface TemplateModel extends TemplateSummaryModel {
	document:string;
	requiredDocumentParameters?:string[];
	requiredFiles?:string[];
	allowFileUploads?: boolean;
	
	presignedUrlExpiresInSeconds?:number;
	rolloutMaximumPerMinute?:number;
	jobExecutionsRolloutConfig?: JobExecutionsRolloutConfig;
	abortConfig?: AbortConfig;
	timeoutConfig?: TimeoutConfig;
}

export interface TemplateListModel {
	templates:TemplateSummaryModel[];
	pagination?: {
		maxResults:number,
		nextToken:string
	};
}
