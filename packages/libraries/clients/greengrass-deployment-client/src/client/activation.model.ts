/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export interface ActivationResponse {
    deviceId?: string;
    activationId: string;
    activationCode: string;
    activationRegion: string;
    createdAt?: Date;
    updatedAt?: Date;
    instanceId?: string;
}

export interface ActivationResource {
    activationId: string;
    activationCode: string;
    activationRegion: string;
}
