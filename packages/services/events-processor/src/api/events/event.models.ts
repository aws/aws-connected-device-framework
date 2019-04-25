/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface EventResource {
    eventId: string;
    eventSourceId: string;
    name: string;
    conditions: EventConditions;
    ruleParameters: string[];
    enabled: boolean;

    // read only (denormalised from event source)
    principal: string;
}

export interface EventItem {
    id: string;
    eventSourceId: string;

    name?: string;
    principal?: string;
    conditions?: EventConditions;
    ruleParameters?: string[];
    enabled?: boolean;
}
export interface EventConditions {
    all?:EventConditions|EventCondition[];
    any?:EventConditions|EventCondition[];
}

export interface EventCondition {
    fact:string;
    operator:string;
    value:number|string|boolean;
}
