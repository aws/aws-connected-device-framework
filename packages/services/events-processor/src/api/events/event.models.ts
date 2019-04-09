/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface EventResource {
    eventId: string;
    eventSourceId: string;
    name: string;
    ruleDefinition: string;
    ruleParameters: string[];
    enabled: boolean;

    // read only (denormalised from event source)
    principal: string;
}

export interface EventItem {
    pk: string;
    sk: string;

    name?: string;
    principal?: string;
    ruleDefinition?: string;
    ruleParameters?: string[];
    enabled?: boolean;

    // gsi keys...
    gsi1Sort?: string;
}
