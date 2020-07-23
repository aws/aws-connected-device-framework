/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { SubscriptionsServiceBase, SubscriptionsService } from './subscriptions.service';
import { GreengrassSubscription } from './subscriptions.model';

@injectable()
export class SubscriptionsApigwService extends SubscriptionsServiceBase implements SubscriptionsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async addSubscriptions(groupName: string, subscriptions: GreengrassSubscription[], additionalHeaders?:RequestHeaders) : Promise<void> {
        ow(groupName, ow.string.nonEmpty);
        ow(subscriptions, ow.array.minLength(1));
        const url = `${this.baseUrl}${super.subscriptionsRelativeUrl(groupName)}`;

        await request.post(url)
            .send({subscriptions})
            .set(this.buildHeaders(additionalHeaders));

    }

    async deleteSubscription(groupName:string, id:string, additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(groupName, ow.string.nonEmpty);
        ow(id, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.subscriptionRelativeUrl(groupName, id)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));

    }

    async deleteSubscriptions(groupName:string, ids:string[], additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(groupName, ow.string.nonEmpty);
        ow(ids, ow.array.minLength(1));

        const url = `${this.baseUrl}${super.subscriptionsRelativeUrl(groupName)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .send({ids});

    }
}
