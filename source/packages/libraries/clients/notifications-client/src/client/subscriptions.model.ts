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

import { EventConditions } from './events.model';
import {
    DynamodDBTargetResource,
    EmailTargetResource,
    MQTTTargetResource,
    PushTargetResource,
    SMSTargetResource,
} from './targets.model';

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
