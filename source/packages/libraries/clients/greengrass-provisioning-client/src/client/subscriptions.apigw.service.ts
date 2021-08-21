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
