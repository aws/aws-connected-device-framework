import { SubscriptionItem } from ''../api/subscriptions/subscription.models';

/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class FilterItem extends SubscriptionItem {
    ruleDefinition: string;
    ruleParameters: string[];
}
