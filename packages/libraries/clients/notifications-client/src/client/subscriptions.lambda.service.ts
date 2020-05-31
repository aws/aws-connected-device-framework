/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {SubscriptionResource, SubscriptionResourceList} from './subscriptions.model';
import {RequestHeaders} from './common.model';
import {SubscriptionsService, SubscriptionsServiceBase} from './subscriptions.service';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class SubscriptionsLambdaService extends SubscriptionsServiceBase implements SubscriptionsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('notifications.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createSubscription(eventId: string, subscription: SubscriptionResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(eventId, ow.string.nonEmpty);
        ow(subscription, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSubscriptionsRelativeUrl(eventId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(subscription);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async getSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResource> {
        ow(subscriptionId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(subscriptionId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async deleteSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(subscriptionId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async listSubscriptionsForUser(userId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList> {
        ow(userId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.userSubscriptionsRelativeUrl(userId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

    async listSubscriptionsForEvent(eventId: string, fromSubscriptionId?: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList> {
        ow(eventId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventSubscriptionsRelativeUrl(eventId))
            .setQueryStringParameters({fromSubscriptionId})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, ev);
        return res.body;
    }

}
