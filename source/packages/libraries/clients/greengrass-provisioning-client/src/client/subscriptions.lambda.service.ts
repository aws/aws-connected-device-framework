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
