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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { SubscriptionResource, SubscriptionResourceList } from './subscriptions.model';
import { SubscriptionsService, SubscriptionsServiceBase } from './subscriptions.service';

@injectable()
export class SubscriptionsApigwService
    extends SubscriptionsServiceBase
    implements SubscriptionsService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async createSubscription(
        eventId: string,
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSubscriptionsRelativeUrl(eventId)}`;
        return await request
            .post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(subscription)
            .use(await signClientRequest())
            .then((res) => {
                const location = res.get('location');
                return location?.split('/')[2];
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getSubscription(
        subscriptionId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscriptionId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateSubscription(
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscription.id)}`;
        return await request
            .patch(url)
            .send(subscription)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteSubscription(
        subscriptionId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscriptionId)}`;
        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listSubscriptionsForUser(
        userId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList> {
        ow(userId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.userSubscriptionsRelativeUrl(userId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listSubscriptionsForEvent(
        eventId: string,
        fromSubscriptionId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList> {
        ow(eventId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.eventSubscriptionsRelativeUrl(eventId)}`;
        const queryString = QSHelper.getQueryString({ fromSubscriptionId });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
