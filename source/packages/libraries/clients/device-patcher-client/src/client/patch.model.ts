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
import { PatchType } from './templates.model';

export class PatchTaskRequest {
    patches: CreatePatchRequest[];
}

export class PatchTaskResponse {
    taskId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePatchRequest {
    deviceId: string;
    patchTemplateName: string;
    patchType?: PatchType;
    extraVars?: { [key: string]: string };
}

export interface UpdatePatchRequest {
    patchId: string;
    patchStatus?: string;
    extraVars?: { [key: string]: string };
}

export interface PatchResponse {
    taskId?: string;
    deviceId: string;
    patchId: string;
    patchTemplateName?: string;
    patchStatus?: patchStatus;
    createdAt?: Date;
    updatedAt?: Date;
    patchType?: PatchType;
    statusMessage?: string;
    associationId?: string;
    extraVars?: { [key: string]: string };
}

export enum patchStatus {
    RETRY = 'retry',
    CREATED = 'created',
    PENDING = 'pending',
    SUCCEESS = 'success',
    FAILED = 'failed',
}

export class ListPatchResponse {
	patches: PatchResponse[];
	pagination?: {
		lastEvaluated?: PatchListPaginationKey,
		count?:number,
	};
}

export declare type PatchListPaginationKey = {
	nextToken: string;
}
