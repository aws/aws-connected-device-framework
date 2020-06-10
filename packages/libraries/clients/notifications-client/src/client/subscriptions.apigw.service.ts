/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {QSHelper} from '../utils/qs.helper';
import {SubscriptionResource, SubscriptionResourceList} from './subscriptions.model';
import {RequestHeaders} from './common.model';
import {SubscriptionsService, SubscriptionsServiceBase} from './subscriptions.service';

@injectable()
export class SubscriptionsApigwService extends SubscriptionsServiceBase implements SubscriptionsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async createSubscription(eventId: string, subscription: SubscriptionResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.eventSubscriptionsRelativeUrl(eventId)}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(subscription);
    }

    async getSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(subscriptionId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<void> {
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
