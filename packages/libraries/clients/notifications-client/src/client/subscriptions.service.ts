/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import { injectable } from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { SubscriptionResource, SubscriptionResourceList } from './subscriptions.model';

@injectable()
export class SubscriptionsService {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('notifications.eventProcessor.baseUrl') as string;

        if (config.has('notifications.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('notifications.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async createSubscription(eventId: string, subscription:SubscriptionResource): Promise<void> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const url = `${this.baseUrl}/events/${eventId}/subscriptions`;
        await request.post(url)
            .set(this.headers)
            .send(subscription);
    }

    public async getSubscription(subscriptionId: string): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/subscriptions/${subscriptionId}`;
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async deleteSubscription(subscriptionId: string,): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/subscriptions/${subscriptionId}`;
        await request.delete(url)
            .set(this.headers);
    }

    public async listSubscriptionsForUser(userId: string): Promise<SubscriptionResourceList> {
        ow(userId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/users/${userId}/subscriptions`;
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async listSubscriptionsForEvent(eventId: string, fromSubscriptionId?:string): Promise<SubscriptionResourceList> {
        ow(eventId, ow.string.nonEmpty);

        let url = `${this.baseUrl}/events/${eventId}/subscriptions`;
        const queryString = QSHelper.getQueryString({fromSubscriptionId});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

}
