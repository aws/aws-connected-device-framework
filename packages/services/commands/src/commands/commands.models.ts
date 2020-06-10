import { SearchRequestModel } from '@cdf/assetlibrary-client';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
	rolloutMaximumPerMinute?:number;
	jobId?:string;
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
