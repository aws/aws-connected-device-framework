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
export interface DeploymentSource {
    type: DeploymentType;
    bucket: string;
    prefix: string;
}

export enum DeploymentType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export interface DeploymentTemplateModel {
    createdAt?: Date;
    description: string;
    enabled: boolean;
    envVars?: string[];
    name: string;
    options?: string[];
    source: DeploymentSource;
    type: DeploymentType;
    updatedAt?: Date;
    versionNo: number;
}

export interface DeploymentTemplateRequest {
    createdAt?: Date;
    description: string;
    enabled: boolean;
    envVars?: string[];
    name: string;
    options?: string[];
    source: DeploymentSource;
    type: DeploymentType;
    updatedAt?: Date;
    versionNo: number;
}

export class DeploymentTemplatesList {
    templates: DeploymentTemplateModel[] = [];
    pagination?: {
        offset:number|string;
        count: number;
    };
}
