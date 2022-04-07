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

import { injectable } from 'inversify';

import { PathHelper } from '../utils/path.helper';
import { ClientServiceBase } from './common.service';
import { MessageResource, NewMessageResource, RecipientList, ReplyList, Recipient, MessageList } from './messages.model';
import { RequestHeaders } from './common.model';

export interface MessagesService {
    createMessage(message: NewMessageResource, additionalHeaders?: RequestHeaders ): Promise<string>;
    getMessage(messageId: string, additionalHeaders?: RequestHeaders ): Promise<MessageResource>;
    listMessages(commandId:string, count?:number, fromCreatedAtExclusive?:number ): Promise<MessageList>
    getRecipient(messageId: string, thingName:string, additionalHeaders?: RequestHeaders) : Promise<Recipient>;
    listRecipients(messageId: string, fromThingNameExclusive?:string, count?:string, additionalHeaders?: RequestHeaders) : Promise<RecipientList>;
    listReplies(messageId: string, thingName: string, fromReceivedAtExclusive?:number, count?:string, additionalHeaders?: RequestHeaders) : Promise<ReplyList>;
}

@injectable()
export class MessagesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected commandMessagesRelativeUrl(commandId:string) : string {
        return PathHelper.encodeUrl('commands', commandId, 'messages');
    }

    protected messageRelativeUrl(messageId:string) : string {
        return PathHelper.encodeUrl('messages', messageId);
    }

    protected messageRecipientsRelativeUrl(messageId:string) : string {
        return PathHelper.encodeUrl('messages', messageId, 'recipients');
    }

    protected messageRecipientRelativeUrl(messageId:string, thingName:string) : string {
        return PathHelper.encodeUrl('messages', messageId, 'recipients', thingName);
    }

    protected messageRepliesRelativeUrl(messageId:string, thingName:string) : string {
        return PathHelper.encodeUrl('messages', messageId, 'recipients', thingName, 'replies');
    }

}
