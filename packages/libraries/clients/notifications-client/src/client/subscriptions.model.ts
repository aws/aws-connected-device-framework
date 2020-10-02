/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { EventConditions } from './events.model';
import { DynamodDBTargetResource, EmailTargetResource, MQTTTargetResource, PushTargetResource, SMSTargetResource } from './targets.model';

export interface SubscriptionBaseResource {
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

    enabled?: boolean;
    alerted?: boolean;
}

export interface SubscriptionV1Resource extends SubscriptionBaseResource {
    targets?: TargetsV1Resource;
}

export interface SubscriptionV2Resource extends SubscriptionBaseResource {
    targets?: TargetsV2Resource;
}

export type SubscriptionResource = SubscriptionV1Resource | SubscriptionV2Resource;

export type TargetsV1Resource = {
    email?: EmailTargetResource;
    sms?: SMSTargetResource;
    mqtt?: MQTTTargetResource;
    dynamodb?: DynamodDBTargetResource;
    push_gcm?: PushTargetResource;
    push_adm?: PushTargetResource;
    push_apns?: PushTargetResource;
};

export type TargetsV2Resource = {
    email?: EmailTargetResource[];
    sms?: SMSTargetResource[];
    mqtt?: MQTTTargetResource[];
    dynamodb?: DynamodDBTargetResource[];
    push_gcm?: PushTargetResource[];
    push_adm?: PushTargetResource[];
    push_apns?: PushTargetResource[];
};

export interface SubscriptionResourceList {
    results: SubscriptionV1Resource[] | SubscriptionV2Resource[];
    pagination?: {
        offset: {
            eventId: string,
            subscriptionId: string
        }
    };
}
