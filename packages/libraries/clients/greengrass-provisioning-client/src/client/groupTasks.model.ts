/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Group } from "./groups.model";

export class GroupTaskItem {
	name: string;
	templateName?: string;
	templateVersionNo?: number;
}

export class GroupTaskSummary {
	taskId:string;
	taskStatus:GrouptTaskStatus;
	type?: GroupTaskType;
	statusMessage?:string;
	groups: Group[] = [];
	createdAt?: Date;
	updatedAt?: Date;

	// no. of batches the task has been split into
	batchesTotal?: number;
	// no. of batches reporting as complete, regardless of whether success or not
	batchesComplete?: number;
}

export type GrouptTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';
export type GroupTaskType = 'Create' | 'Update';