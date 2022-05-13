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

import { inject, injectable } from 'inversify';
import ow from 'ow';

import {
    LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService
} from '@cdf/lambda-invoke';
import { MessagesService, MessagesServiceBase } from './messages.service';
import { MessageResource, NewMessageResource, RecipientList, ReplyList, Recipient } from './messages.model';
import { RequestHeaders } from './common.model';


@injectable()
export class MessagesLambdaService extends MessagesServiceBase implements MessagesService {

    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.COMMANDANDCONTROL_API_FUNCTION_NAME
    }

    async createMessage(message: NewMessageResource, additionalHeaders?: RequestHeaders ): Promise<string> {
        ow(message, ow.object.nonEmpty);
        ow(message.commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandMessagesRelativeUrl(message.commandId))
            .setMethod('POST')
            .setBody(message)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const id = res.header?.['x-messageid'];
        return id;
    }

    async getMessage(messageId: string, additionalHeaders?: RequestHeaders ): Promise<MessageResource> {
        ow(messageId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.messageRelativeUrl(messageId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getRecipient(messageId: string, thingName:string, additionalHeaders?: RequestHeaders ): Promise<Recipient> {
        ow(messageId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.messageRecipientRelativeUrl(messageId,thingName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listRecipients(messageId: string, fromThingNameExclusive?:string, count?:string, additionalHeaders?: RequestHeaders) : Promise<RecipientList> {
        ow(messageId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.messageRecipientsRelativeUrl(messageId))
            .setQueryStringParameters({
                fromThingNameExclusive,
                count: `${count}`
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listReplies(messageId: string, thingName: string, fromReceivedAtExclusive?:number, count?:string, additionalHeaders?: RequestHeaders) : Promise<ReplyList> {
        ow(messageId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.messageRepliesRelativeUrl(messageId, thingName))
            .setQueryStringParameters({
                fromReceivedAtExclusive: `${fromReceivedAtExclusive}`,
                count: `${count}`
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

}
