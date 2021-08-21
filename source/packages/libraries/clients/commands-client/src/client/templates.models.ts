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

import { AbortConfig, JobExecutionsRolloutConfig, TimeoutConfig } from "./commands.model";

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
