/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { TargetsItem } from '../api/subscriptions/subscription.models';

export class AlertItem {

    readonly version: 2.0;

    time: string;

    subscription: {
        id: string;
        principalValue: string;
    };

    targets?: TargetsItem;

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
