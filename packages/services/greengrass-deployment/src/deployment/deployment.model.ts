/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export interface DeploymentRequest {
    deviceId: string;
    deploymentTemplateName: string;
    deploymentStatus?: DeploymentStatus;
}

export interface DeploymentModel {
    deviceId: string;
    deploymentId: string;
    deploymentTemplateName?: string;
    deploymentStatus?: DeploymentStatus;
    createdAt?: Date;
    updatedAt?: Date;
    deploymentTemplate?: DeploymentTemplateModel;
    deploymentType?: DeploymentType;
}

export interface DeploymentItem {
    deviceId: string;
    deploymentId: string;
    deploymentTemplateName: string;
    deploymentStatus: DeploymentStatus;
    createdAt?:string;
    updatedAt?: string;
    deploymentTemplate?: DeploymentTemplateModel;
}

export interface DeploymentTemplateModel {
    source: DeploymentSource;
    type: DeploymentType;
    name: string;
    versionNo: number;
    envVars?: string[];
    options?: string[];
}

export interface DeploymentSource {
    type: DeploymentType;
    bucket: string;
    prefix: string;
}

export enum DeploymentType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export enum DeploymentStatus {
    CREATED='created',
    PENDING='pending',
    SUCCEESS='success',
    FAILED='failed'
}

export class DeploymentList {
    deployments: DeploymentModel[] = [];
    pagination?: {
        offset:number|string;
        count: number;
    };
}

export interface AssociationModel {
    deploymentId: string;
    associationId: string;
}
