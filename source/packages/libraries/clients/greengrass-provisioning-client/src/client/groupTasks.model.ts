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
