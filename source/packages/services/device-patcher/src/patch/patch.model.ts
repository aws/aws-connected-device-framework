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
import { PatchTemplateItem } from '../templates/template.model';
import { PatchListPaginationKey } from './patchTask.dao';

export class PatchResource {
    taskId?: string;
    deviceId: string;
    patchId?: string;
    patchTemplateName?: string;
    patchStatus?: PatchStatus;
    createdAt?: Date;
    updatedAt?: Date;
    patchTemplate?: PatchTemplateItem;
    patchType?: PatchType;
    statusMessage?: string;
    associationId?: string;
    extraVars?: { [key: string]: string}
}

export class PatchItem {
    taskId?: string;
    deviceId: string;
    patchId?: string;
    patchTemplateName?: string;
    patchStatus?: PatchStatus;
    createdAt?: Date;
    updatedAt?: Date;
    patchTemplate?: PatchTemplateItem;
    patchType?: PatchType;
    statusMessage?: string;
    associationId?: string;
    extraVars?: { [key: string]: string}
}

export interface PatchSource {
    bucket: string;
    key: string;
}

export enum PatchType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export enum PatchStatus {
    RETRY='retry',
    CREATED='created',
    PENDING='pending',
    SUCCEESS='success',
    FAILED='failed'
}

export interface PatchListResource {
    patches: PatchItem[];
    pagination?: {
        lastEvaluated?: PatchListPaginationKey,
        count?:number,
    };
}

export interface AssociationModel {
    patchId: string;
    associationId: string;
}
