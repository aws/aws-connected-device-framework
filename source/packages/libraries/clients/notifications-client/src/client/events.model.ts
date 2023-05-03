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

export interface EventResource {
    eventId?: string;
    eventSourceId?: string;
    name: string;
    conditions: EventConditions;
    ruleParameters?: string[];
    enabled?: boolean;

    // a map of templates
    templates: TemplateMap;
    // the defined templates are then associated with a potential target
    supportedTargets: TargetTemplateMap;

    // read only (denormalised from event source)
    readonly principal?: string;
}

export interface EventResourceList {
    results: EventResource[];
    pagination?: {
        offset: {
            eventSourceId: string;
            eventId: string;
        };
        count: number;
    };
}

export interface EventConditions {
    all?: EventConditions | EventCondition[];
    any?: EventConditions | EventCondition[];
}
export interface EventCondition {
    fact: string;
    operator: string;
    value: number | string | boolean;
}

export enum EventTargetType {
    EMAIL = 'email',
    SMS = 'sms',
    MQTT = 'mqtt',
}

export type TemplateMap = { [key: string]: string };
export type TargetTemplateMap = { [key in EventTargetType]?: string };
