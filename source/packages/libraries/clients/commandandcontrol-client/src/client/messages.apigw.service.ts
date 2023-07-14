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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import {
    MessageList,
    MessageResource,
    NewMessageResource,
    Recipient,
    RecipientList,
    ReplyList,
} from './messages.model';
import { MessagesService, MessagesServiceBase } from './messages.service';

@injectable()
export class MessagesApigwService extends MessagesServiceBase implements MessagesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.COMMANDANDCONTROL_BASE_URL;
    }

    async createMessage(
        message: NewMessageResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string> {
        ow(message, ow.object.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.commandMessagesRelativeUrl(message.commandId)}`)
            .send(message)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.get('x-messageid');
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getMessage(
        messageId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<MessageResource> {
        const url = `${this.baseUrl}${super.messageRelativeUrl(messageId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listMessages(
        commandId: string,
        count?: number,
        fromCreatedAtExclusive?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<MessageList> {
        let url = `${this.baseUrl}${super.commandMessagesRelativeUrl(commandId)}`;
        const queryString = QSHelper.getQueryString({ count, fromCreatedAtExclusive });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getRecipient(
        messageId: string,
        thingName: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<Recipient> {
        const url = `${this.baseUrl}${super.messageRecipientRelativeUrl(messageId, thingName)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listRecipients(
        messageId: string,
        fromThingNameExclusive?: string,
        count?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<RecipientList> {
        let url = `${this.baseUrl}${super.messageRecipientsRelativeUrl(messageId)}`;
        const queryString = QSHelper.getQueryString({ count, fromThingNameExclusive });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listReplies(
        messageId: string,
        thingName: string,
        fromReceivedAtExclusive?: number,
        count?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<ReplyList> {
        let url = `${this.baseUrl}${super.messageRepliesRelativeUrl(messageId, thingName)}`;
        const queryString = QSHelper.getQueryString({ count, fromReceivedAtExclusive });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
