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
import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { SubscriptionResource, SubscriptionResourceList } from './subscriptions.model';
import { SubscriptionsService, SubscriptionsServiceBase } from './subscriptions.service';

@injectable()
export class SubscriptionsLambdaService
    extends SubscriptionsServiceBase
    implements SubscriptionsService
{
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.NOTIFICATIONS_API_FUNCTION_NAME;
    }

    async createSubscription(
        eventId: string,
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSubscriptionsRelativeUrl(eventId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(subscription);

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);

        const location = res.header['location'];
        return location?.split('/')[2];
    }

    async getSubscription(
        subscriptionId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(subscriptionId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async updateSubscription(
        subscription: SubscriptionResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscription, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(subscription.id))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(subscription);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async deleteSubscription(
        subscriptionId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(subscriptionId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async listSubscriptionsForUser(
        userId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList> {
        ow(userId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.userSubscriptionsRelativeUrl(userId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async listSubscriptionsForEvent(
        eventId: string,
        fromSubscriptionId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<SubscriptionResourceList> {
        ow(eventId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSubscriptionsRelativeUrl(eventId))
            .setQueryStringParameters({ fromSubscriptionId })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }
}
