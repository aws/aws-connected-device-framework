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
import { injectable } from 'inversify';
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
    templateProperties?: string[];

    // if set, disables the alert threshold which means every alert will be dispatched rather than just the first.
    disableAlertThreshold: boolean;
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

export interface EventItem {
    id: string;
    eventSourceId: string;

    name?: string;
    principal?: string;
    conditions?: EventConditions;
    ruleParameters?: string[];
    enabled?: boolean;

    templates: TemplateMap;
    supportedTargets: TargetTemplateMap;
    templateProperties?: string[];

    disableAlertThreshold?: boolean;
}
export interface EventConditions {
    all?: EventConditions | EventCondition[];
    any?: EventConditions | EventCondition[];
}
export interface EventCondition {
    fact: string;
    operator: string;
    value: number | string | boolean | EventFactCondition;
}
export interface EventFactCondition {
    fact: string;
}

@injectable()
export class EventConditionsUtils {
    public extractParameters(ec: EventConditions): string[] {
        if (ec === undefined) {
            return undefined;
        }

        const parameters: string[] = [];

        if (ec?.all) {
            if (isEventConditions(ec.all)) {
                parameters.push(...this.extractParameters(ec.all));
            } else {
                for (const condition of ec.all) {
                    const extractedParameter = this.extractParameter(condition);
                    if (extractedParameter) {
                        parameters.push(extractedParameter);
                    }
                }
            }
        }

        if (ec?.any) {
            if (isEventConditions(ec.any)) {
                parameters.push(...this.extractParameters(ec.any));
            } else {
                for (const condition of ec.any) {
                    const extractedParameter = this.extractParameter(condition);
                    if (extractedParameter) {
                        parameters.push(extractedParameter);
                    }
                }
            }
        }
        return parameters;
    }
    public extractParameter(ec: EventCondition): string {
        if (typeof ec?.value === 'string') {
            if (ec.value.indexOf('$') === 0) {
                return ec.value.replace('$', '');
            }
        }
        return undefined;
    }

    public populateParameters(
        ec: EventConditions,
        valueMap: { [key: string]: string | boolean | number }
    ): void {
        if (ec?.all) {
            if (isEventConditions(ec.all)) {
                this.populateParameters(ec.all, valueMap);
            } else {
                for (const condition of ec.all) {
                    this.populateParameter(condition, valueMap);
                }
            }
        }

        if (ec?.any) {
            if (isEventConditions(ec.any)) {
                this.populateParameters(ec.any, valueMap);
            } else {
                for (const condition of ec.any) {
                    this.populateParameter(condition, valueMap);
                }
            }
        }
    }
    public populateParameter(
        ec: EventCondition,
        valueMap: { [key: string]: string | boolean | number }
    ): void {
        if (valueMap !== undefined) {
            for (const key of Object.keys(valueMap)) {
                if (ec.value === `$${key}`) {
                    ec.value = valueMap[key];
                    return;
                }
            }
        }
    }
}

export enum EventTargetType {
    'email',
    'sms',
    'mqtt',
    'dynamodb',
    'push_gcm',
    'push_adm',
    'push_apns',
}
export type EventTargetTypeStrings = keyof typeof EventTargetType;

export type TemplateMap = { [key: string]: string };
export type TargetTemplateMap = { [key in EventTargetTypeStrings]: string };
export type TemplatePropertiesData = { [key: string]: string | number | boolean };

export function isEventConditions(
    conditions: EventConditions | EventCondition[]
): conditions is EventConditions {
    return (<EventCondition[]>conditions).length === undefined;
}
