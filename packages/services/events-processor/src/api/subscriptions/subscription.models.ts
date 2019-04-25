import { EventConditions } from '../events/event.models';

/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface SubscriptionResource {
    subscriptionId: string;
    userId: string;
    eventId: string;
    principalValue: string;
    ruleParameterValues?: { [key: string] : string};

    targets?: {
        sns?: {
            arn: string;
        };
        iotCore?: {
            topic: string;
        };
    };

    alerted: boolean;
    enabled: boolean;
}

export class SubscriptionItem {
    id: string;

    principalValue?: string;
    ruleParameterValues?: { [key: string] : string};
    event?: {
        id: string;
        name: string;
        conditions: EventConditions;
    };
    eventSource?: {
        id: string;
        principal: string;
    };
    user?: {
        id: string;
    };

    targets?: {
        sns?: {
            arn: string;
        };
        iotCore?: {
            topic: string;
        };
    };

    enabled?: boolean;
    alerted?: boolean;

}
