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
import { PathHelper } from '../utils/path.helper';
import { SubscriptionRequest, Response, UserSubscriptionItemList } from './notifications.model';

@injectable()
export class NotificationsService {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('notifications.eventProcessor.baseUrl') as string;

        if (config.has('notifications.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('notifications.eventProcessor.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async createEventSubscription(eventId:string, subscriptionRequest: SubscriptionRequest): Promise<Response<string>> {
        ow(eventId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/events/${PathHelper.encodeUrl(eventId)}/subscriptions`;
        const res = await request.post(url)
            .set(this.headers)
            .send(subscriptionRequest);

        return res.body;
    }

    public async getSubscriptionByUserId(userId: string): Promise<UserSubscriptionItemList> {
        ow(userId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/users/${PathHelper.encodeUrl(userId)}/subscriptions`;
        const res = await request.get(url).set(this.headers);

        return res.body;
    }
}
