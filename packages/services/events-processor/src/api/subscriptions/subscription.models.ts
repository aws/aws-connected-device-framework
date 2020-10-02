/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { EventConditions } from '../events/event.models';
import { EmailTargetResource, SMSTargetResource, MQTTTargetResource, DynamodDBTargetResource, PushTargetResource, EmailTargetItem, SMSTargetItem, MQTTTargetItem, DynamodDBTargetItem, PushTargetItem } from '../targets/targets.models';

export abstract class SubscriptionBaseResource {
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

    enabled?: boolean;
    alerted?: boolean;
}

export class SubscriptionV1Resource extends SubscriptionBaseResource {
    targets?: TargetsV1Resource;
}

export class SubscriptionV2Resource extends SubscriptionBaseResource {
    targets?: TargetsV2Resource;
}

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

export type TargetsItem = {
    email?: EmailTargetItem[];
    sms?: SMSTargetItem[];
    mqtt?: MQTTTargetItem[];
    dynamodb?: DynamodDBTargetItem[];
    push_gcm?: PushTargetItem[];
    push_adm?: PushTargetItem[];
    push_apns?: PushTargetItem[];
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

export class SubscriptionItem {
    id: string;

    principalValue?: string;
    ruleParameterValues?: { [key: string] : string};
    event?: {
        id?: string;
        name?: string;
        conditions?: EventConditions;
        disableAlertThreshold?: boolean;
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

    targets?: TargetsItem;

    enabled?: boolean;
    alerted?: boolean;
}
