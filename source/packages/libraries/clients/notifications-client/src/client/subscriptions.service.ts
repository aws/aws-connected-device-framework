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

import { injectable } from 'inversify';
import { RequestHeaders } from './common.model';
import { CommonServiceBase } from './common.service';
import { SubscriptionResource, SubscriptionResourceList } from './subscriptions.model';

export interface SubscriptionsService {
    createSubscription(
        eventId: string,
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string>;

    getSubscription(
        subscriptionId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResource>;

    updateSubscription(
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void>;

    deleteSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    listSubscriptionsForUser(
        userId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList>;

    listSubscriptionsForEvent(
        eventId: string,
        fromSubscriptionId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList>;
}

@injectable()
export class SubscriptionsServiceBase extends CommonServiceBase {
    protected eventSubscriptionsRelativeUrl(eventId: string): string {
        return `/events/${eventId}/subscriptions`;
    }

    protected subscriptionRelativeUrl(subscriptionId: string): string {
        return `/subscriptions/${subscriptionId}`;
    }

    protected userSubscriptionsRelativeUrl(userId: string): string {
        return `/users/${userId}/subscriptions`;
    }
}
