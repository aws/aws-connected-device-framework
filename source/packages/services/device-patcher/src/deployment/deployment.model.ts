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
import {DeploymentTemplateItem} from '../templates/template.model';
import {DeploymentListPaginationKey} from './deploymentTask.dao';

export class DeploymentResource {
    taskId?: string;
    deviceId: string;
    deploymentId?: string;
    deploymentTemplateName?: string;
    deploymentStatus?: DeploymentStatus;
    createdAt?: Date;
    updatedAt?: Date;
    deploymentTemplate?: DeploymentTemplateItem;
    deploymentType?: DeploymentType;
    statusMessage?: string;
    associationId?: string;
    extraVars?: { [key: string]: string}
}

export class DeploymentItem {
    taskId?: string;
    deviceId: string;
    deploymentId?: string;
    deploymentTemplateName?: string;
    deploymentStatus?: DeploymentStatus;
    createdAt?: Date;
    updatedAt?: Date;
    deploymentTemplate?: DeploymentTemplateItem;
    deploymentType?: DeploymentType;
    statusMessage?: string;
    associationId?: string;
    extraVars?: { [key: string]: string}
}

export interface DeploymentSource {
    bucket: string;
    key: string;
}

export enum DeploymentType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export enum DeploymentStatus {
    RETRY='retry',
    CREATED='created',
    PENDING='pending',
    SUCCEESS='success',
    FAILED='failed'
}

export interface DeploymentListResource {
    deployments: DeploymentItem[];
    pagination?: {
        lastEvaluated?: DeploymentListPaginationKey,
        count?:number,
    };
}

export interface AssociationModel {
    deploymentId: string;
    associationId: string;
}
