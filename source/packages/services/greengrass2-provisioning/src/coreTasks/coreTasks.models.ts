
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
import { CoreItem, CoreResource, NewCoreResource } from "../cores/cores.models.js";

export interface BaseCoreTaskResource {
	id: string;
	taskStatus: CoreTaskStatus;
	statusMessage?: string;
	createdAt: Date;
	updatedAt?: Date;
}

export interface NewCoreTaskResource {
	coreVersion: string;
	cores: NewCoreResource[];
	type: CoreTaskType;
	options?: DeleteCoreTaskOptions;
}

export interface DeleteCoreTaskOptions {
	deprovisionClientDevices: boolean;
	deprovisionCores: boolean;
}
export interface CoreTaskResource {
	id: string;
	type: CoreTaskType;
	coreVersion: string;
	options?: DeleteCoreTaskOptions;
	cores: CoreResource[];
	taskStatus: CoreTaskStatus;
	statusMessage?: string;
	createdAt: Date;
	updatedAt?: Date;
}
export interface CoreTaskListResource {
	tasks: CoreTaskResource[];
	pagination?: {
		lastEvaluated?: {
			taskId: string
		},
		count?: number
	};
}

export interface CoreTaskItem {
	id?: string;
	type: CoreTaskType;
	options?: DeleteCoreTaskOptions;
	coreVersion: string;
	cores: CoreItem[];
	taskStatus?: CoreTaskStatus;
	statusMessage?: string;
	createdAt?: Date;
	updatedAt?: Date;

	// no. of batches the task has been split into
	batchesTotal?: number;
	// no. of batches reporting as complete, regardless of whether success or not
	batchesComplete?: number;
}

export type CoreTaskStatus = 'Waiting' | 'InProgress' | 'Success' | 'Failure';

export const CoreTasksEvent = 'CoreTasks Resource Changes'

export type CoreTaskType = 'Create' | 'Delete'
