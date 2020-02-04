/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { SubscriptionTargets } from '../api/subscriptions/subscription.models';
export class AlertItem {
    time: string;

    subscription: {
        id: string;
        principalValue: string;
    };

    targets?: SubscriptionTargets;

    sns?: {
        topicArn: string;
    };

    eventSource: {
        principal: string;
    };

    event: {
        id: string;
        name: string;
    };

    user: {
        id: string;
    };

    templatePropertiesData: {
        [key: string]: string | number | boolean
    };
}
