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
import { SearchRequestModel } from '@awssolutions/cdf-assetlibrary-client';

export interface CommandSummaryModel {
	commandId:string;
	description:string;
	templateId:string;
	commandStatus:CommandStatus;
}
export interface CommandModel extends CommandSummaryModel {
	jobStatus:JobStatus;
	targets?:string[];
	targetQuery?:SearchRequestModel;
	documentParameters?: {[key:string]:string};
	jobParameters?: {[key:string]:string};
	files?: {[key:string]:S3FileModel};
	type:CommandType;
	jobId?:string;
	
	rolloutMaximumPerMinute?:number;
	jobExecutionsRolloutConfig?: JobExecutionsRolloutConfig;
	abortConfig?: AbortConfig;
	timeoutConfig?: TimeoutConfig;
}

export interface JobExecutionsRolloutConfig {
	maximumPerMinute: number;
	exponentialRate: {
		baseRatePerMinute: number;
		incrementFactor: number;
		rateIncreaseCriteria: {
			numberOfNotifiedThings: number;
			numberOfSucceededThings: number;
		}

	}
}

export interface AbortConfigCriteria {
	failureType: 'FAILED'|'REJECTED'|'TIMED_OUT'|'ALL';
	action: 'CANCEL';
	thresholdPercentage: number;
	minNumberOfExecutedThings: number;
}

export interface AbortConfig {
	criteriaList: AbortConfigCriteria[];
}

export interface TimeoutConfig {
	inProgressTimeoutInMinutes: number;
}

export interface S3FileModel {
	bucketName:string;
	key:string;
}

export interface CommandListModel {
	results:CommandSummaryModel[];
	pagination?: {
		offset:number,
		count:number
	};
}

export interface ExecutionSummaryModel {
	thingName:string;
	executionNumber: number;
	status:ExecutionStatus;
}

export interface ExecutionModel extends ExecutionSummaryModel {
	statusDetails?: {[key:string] : string};
	createdAt?:Date;
	lastUpdatedAt:Date;
	queuedAt:Date;
	startedAt?:Date;
	percentComplete?:number;
}

export interface ExecutionSummaryListModel {
	results:ExecutionSummaryModel[];
	pagination?: {
		maxResults:number,
		nextToken:string
	};
}

// export interface ExecutionListModel {
// 	results:ExecutionModel[];
// 	pagination?: {
// 		maxResults:number,
// 		nextToken:string
// 	};
// }

export enum CommandType {
	CONTINUOUS = 'CONTINUOUS',
	SNAPSHOT = 'SNAPSHOT'
}

export enum CommandStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	CANCELLED = 'CANCELLED'
}

export enum JobStatus {
	IN_PROGRESS = 'IN_PROGRESS',
	CANCELLED = 'CANCELLED',
	COMPLETED = 'COMPLETED'
}

export enum ExecutionStatus {
	QUEUED = 'QUEUED',
	IN_PROGRESS = 'IN_PROGRESS',
	FAILED = 'FAILED',
	SUCCESS = 'SUCCESS',
	CANCELED = 'CANCELED',
	REJECTED = 'REJECTED',
	REMOVED = 'REMOVED'
}
