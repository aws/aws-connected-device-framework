/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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

}
export interface EventConditions {
    all?:EventConditions|EventCondition[];
    any?:EventConditions|EventCondition[];
}
export interface EventCondition {
    fact:string;
    operator:string;
    value:number|string|boolean|EventFactCondition;
}
export interface EventFactCondition {
    fact:string;
}

@injectable()
export class EventConditionsUtils {
    public extractParameters(ec:EventConditions) : string[] {
        const parameters:string[]= [];

        if (ec.all) {
            if (isEventConditions(ec.all)) {
                parameters.push(...this.extractParameters(ec.all));
            } else {
                for(const condition of ec.all) {
                    parameters.push(this.extractParameter(condition));
                }
            }
        }

        if (ec.any) {
            if (isEventConditions(ec.any)) {
                parameters.push(...this.extractParameters(ec.any));
            } else {
                for(const condition of ec.any) {
                    parameters.push(this.extractParameter(condition));
                }
            }
        }
        return parameters;
    }
    public extractParameter(ec:EventCondition) : string {
        if (typeof ec.value === 'string') {
            if (ec.value.indexOf('$')===0) {
                return ec.value.replace('$', '');
            }
        }
        return undefined;
    }

    public populateParameters(ec:EventConditions, valueMap:{[key:string]:string|boolean|number}) {
        if (ec.all) {
            if (isEventConditions(ec.all)) {
                this.populateParameters(ec.all,valueMap);
            } else {
                for(const condition of ec.all) {
                    this.populateParameter(condition,valueMap);
                }
            }
        }

        if (ec.any) {
            if (isEventConditions(ec.any)) {
                this.populateParameters(ec.any,valueMap);
            } else {
                for(const condition of ec.any) {
                    this.populateParameter(condition,valueMap);
                }
            }
        }
    }
    public populateParameter(ec:EventCondition, valueMap:{[key:string]:string|boolean|number}) {
        if (valueMap!==undefined) {
            for(const key of Object.keys(valueMap)) {
                if (ec.value===`\$${key}`) {
                    ec.value=valueMap[key];
                    return;
                }
            }
        }
    }
}

export enum EventTargetType {
    EMAIL = 'email',
    SMS = 'sms',
    MQTT = 'mqtt',
    DYNAMODB = 'dynamodb'
}

export type TemplateMap = { [key: string] : string};
export type TargetTemplateMap = { [key in EventTargetType] : string};
export type TemplatePropertiesData = {[key: string]: string | number | boolean};

export function isEventConditions(conditions: EventConditions | EventCondition[]): conditions is EventConditions {
    return (<EventCondition[]>conditions).length === undefined;
}
