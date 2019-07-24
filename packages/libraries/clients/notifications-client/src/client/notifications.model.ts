/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 */

export interface NotificationRequest {
    provisioningTemplateId:string;
	parameters: {[key:string]:string};
}

export type SubscriptionTargets = {
    email?: EmailSubscriptionConfig;
    sms?: SMSSubscriptionConfig;
    mqtt?: MQTTSubscriptionConfig;
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

export interface SubscriptionRequest {
    principalValue?: string;
    ruleParameterValues?: { [key: string] : string};
    user?: {
        id: string;
    };

    targets?: SubscriptionTargets;
};

export interface Response<T> {
    statusCode: number;
    result: T | null;
};

export class UserSubscriptionItem {
    id: string;
    event?: {
        id?: string;
        name?: string;
    };
    user?: {
        id: string;
    };
}

export class UserSubscriptionItemList {
    results: UserSubscriptionItem[]=[];
}
