/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface SubscriptionResource {
    subscriptionId: string;
    userId: string;
    eventId: string;
    ruleParameterValues?: { [key: string] : string[]};
    alerted: boolean;
    enabled: boolean;
}

export class SubscriptionItem {
    id: string;

    ruleParameterValues?: { [key: string] : string[]};
    enabled?: boolean;
    alerted?: boolean;

    event?: SubscriptionEventItem;
    eventSource?: SubscriptionEventSourceItem;
    user?: SubscriptionUserItem;

}

export class SubscriptionEventSourceItem {
    id: string;
    principal: string;
}

export class SubscriptionEventItem {
    id: string;
    ruleDefinition: string;
}

export class SubscriptionUserItem {
    id: string;
}
