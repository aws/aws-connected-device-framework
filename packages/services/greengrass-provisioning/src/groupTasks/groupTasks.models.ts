/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { GroupItem, GroupResource } from "../groups/groups.models";
import { GrouptTaskStatus } from "./groupTaskStatus.models";

export class GroupTaskSummaryResource {
	taskId:string;
	taskStatus:GrouptTaskStatus;
	type?: GroupTaskType;
	statusMessage?:string;
	groups: GroupResource[] = [];
	createdAt?: Date;
	updatedAt?: Date;
}
export class GroupTaskSummaryItem {
	taskId:string;
	taskStatus:GrouptTaskStatus;
	type?: GroupTaskType;
	statusMessage?:string;
	groups: GroupItem[] = [];
	createdAt?: Date;
	updatedAt?: Date;

	// no. of batches the task has been split into
	batchesTotal?: number;
	// no. of batches reporting as complete, regardless of whether success or not
	batchesComplete?: number;
}

export type GroupTaskType = 'Create' | 'Update';
