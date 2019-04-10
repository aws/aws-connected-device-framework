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
    pk: string;
    sk: string;

    userId: string;
    ruleParameterValues?: { [key: string] : string[]};
    enabled: boolean;
    alerted: boolean;

    // gsi keys...
    gsiBucket?: string;
    gsi2Sort?: string;
    gsi3Sort?: string;
}
