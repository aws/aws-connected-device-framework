/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { EventConditions } from '../events/event.models';
export interface SubscriptionResource {
    id: string;

    principalValue?: string;
    ruleParameterValues?: { [key: string] : string};
    event?: {
        id: string;
        name?: string;
        conditions?: EventConditions;
    };
    user?: {
        id: string;
    };

    targets?: SubscriptionTargets;

    enabled?: boolean;
    alerted?: boolean;
}

export type SubscriptionTargets = {
    email?: EmailSubscriptionConfig;
    sms?: SMSSubscriptionConfig;
    mqtt?: MQTTSubscriptionConfig;
    dynamodb?: DynamodDBSubscriptionConfig;
};

export type EmailSubscriptionConfig = {
    address:string
};

export type SMSSubscriptionConfig = {
    phoneNumber:string
};

export type MQTTSubscriptionConfig = {
    topic:string
};

export type AttributeMapping = { [key: string] : string};

export type DynamodDBSubscriptionConfig = {
    tableName:string

    // Column mapping for dynamodb targets
    attributeMapping: AttributeMapping;
};

export interface SubscriptionResourceList {
    results: SubscriptionResource[];
    pagination?: {
        offset: {
            eventId: string,
            subscriptionId: string
        }
    };
}

export class SubscriptionItem {
    id: string;

    principalValue?: string;
    ruleParameterValues?: { [key: string] : string};
    event?: {
        id?: string;
        name?: string;
        conditions?: EventConditions;
    };
    eventSource?: {
        id: string;
        principal: string;
    };
    user?: {
        id: string;
    };

    sns?: {
        topicArn:string;
    };

    dynamodb?: {
        tableName:string;
        attributeMapping: { [key: string] : string};
    };

    targets?: SubscriptionTargets;

    enabled?: boolean;
    alerted?: boolean;

}
