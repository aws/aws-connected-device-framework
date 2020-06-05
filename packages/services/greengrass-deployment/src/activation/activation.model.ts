/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface SSMActivationRequest {
    deviceId: string;
}

export interface ActivationRequest {
    deviceId: string;
}

export interface ActivationModel {
    deviceId?: string;
    activationId: string;
    createdAt?: Date;
    updatedAt?: Date;
    instanceId?: string;
}

export interface ActivationResource {
    activationId: string;
    activationCode: string;
    activationRegion: string;
}

export enum DeploymentType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export class ActivationList {
    activations: ActivationModel[] = [];
}
