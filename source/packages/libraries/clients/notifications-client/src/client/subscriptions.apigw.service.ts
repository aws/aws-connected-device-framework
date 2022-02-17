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
import ow from 'ow';
import * as request from 'superagent';

import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { SubscriptionResource, SubscriptionResourceList } from './subscriptions.model';
import { SubscriptionsService, SubscriptionsServiceBase } from './subscriptions.service';

@injectable()
export class SubscriptionsApigwService extends SubscriptionsServiceBase implements SubscriptionsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async createSubscription(eventId: string, subscription: SubscriptionResource, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSubscriptionsRelativeUrl(eventId)}`;
        const res = await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(subscription);

        const location = res.get('location');
        return location?.split('/')[2];
    }

    async getSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscriptionId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateSubscription(subscription: SubscriptionResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscription.id)}`;
        const res = await request.patch(url)
        .set(this.buildHeaders(additionalHeaders))
        .send(subscription);

        return res.body;
    }

    async deleteSubscription(subscriptionId:string , additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscriptionId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listSubscriptionsForUser(userId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList> {
        ow(userId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.userSubscriptionsRelativeUrl(userId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listSubscriptionsForEvent(eventId: string, fromSubscriptionId?: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList> {
        ow(eventId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.eventSubscriptionsRelativeUrl(eventId)}`;
        const queryString = QSHelper.getQueryString({fromSubscriptionId});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

}
