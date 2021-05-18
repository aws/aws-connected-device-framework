/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

// export interface SSMActivationRequest {
//     deviceId: string;
// }


export class ActivationResource {
    deviceId?: string;
    activationId?: string;
    activationCode?: string;
    activationRegion?: string;
    createdAt?: Date;
    updatedAt?: Date;
    instanceId?: string;
}

export class ActivationItem {
    deviceId?: string;
    activationId?: string;
    activationCode?: string;
    activationRegion?: string;
    createdAt?: Date;
    updatedAt?: Date;
    instanceId?: string;
}

export class ActivationItemList {
    activations: ActivationItem[] = [];
    pagination?: {
        offset:number|string;
        count: number;
    };
}
