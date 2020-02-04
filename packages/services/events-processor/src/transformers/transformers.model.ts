/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export interface CommonEvent {
    eventSourceId: string;
    principal: string;
    principalValue: string;
    sourceChangeType?: string;
    attributes?: {
        [key: string] : string|boolean|number|string[]|number[]
    };
}
