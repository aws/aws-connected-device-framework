/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { EventConditions } from './events.model';

export interface SubscriptionResource {
    id?: string;

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
    dynamodb?: DynamoDBSubscriptionConfig;
};

export type AttributeMapping = { [key: string] : string};

export type DynamoDBSubscriptionConfig = {
    tableName:string;
    attributeMapping: AttributeMapping;
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

export interface SubscriptionResourceList {
    results: SubscriptionResource[];
    pagination?: {
        offset: {
            eventId: string,
            subscriptionId: string
        }
    };
}
