/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { SubscriptionsServiceBase, SubscriptionsService } from './subscriptions.service';
import { GreengrassSubscription } from './subscriptions.model';

@injectable()
export class SubscriptionsLambdaService extends SubscriptionsServiceBase implements SubscriptionsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassProvisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async addSubscriptions(groupName: string, subscriptions: GreengrassSubscription[], additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(groupName, ow.string.nonEmpty);
        ow(subscriptions, ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionsRelativeUrl(groupName))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({subscriptions});

        await this.lambdaInvoker.invoke(this.functionName, event);

    }

    async deleteSubscription(groupName:string, id:string, additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(groupName, ow.string.nonEmpty);
        ow(id, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionRelativeUrl(groupName, id))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deleteSubscriptions(groupName:string, ids:string[], additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(groupName, ow.string.nonEmpty);
        ow(ids, ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.subscriptionsRelativeUrl(groupName))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({ids});

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

}
