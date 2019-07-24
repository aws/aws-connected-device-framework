/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

    // a map of templates
    templates: TemplateMap;
    // the defined templates are then associated with a potential target
    supportedTargets: TargetTemplateMap;

    // read only (denormalised from event source)
    principal: string;
}

export interface EventResourceList {
    results: EventResource[];
    pagination?: {
        offset: {
            eventSourceId: string,
            eventId: string
        },
        count: number
    };
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

export enum EventTargetType {
    EMAIL = 'email',
    SMS = 'sms',
    MQTT = 'mqtt'
}

export type TemplateMap = { [key: string] : string};
export type TargetTemplateMap = { [key in EventTargetType] : string};
