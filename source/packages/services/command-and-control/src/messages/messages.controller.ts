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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPost,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { MessagesAssembler } from './messages.assembler';
import { MessageResource, NewMessageResource, Recipient } from './messages.models';
import { MessagesService } from './messages.service';

@controller('')
export class MessagesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.MessagesService) private service: MessagesService,
        @inject(TYPES.MessagesAssembler) private assembler: MessagesAssembler
    ) {}

    @httpPost('/commands/:commandId/messages')
    public async createMessage(
        @requestParam('commandId') commandId: string,
        @requestBody() resource: NewMessageResource,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `messages.controller createMessage: in: commandId:${commandId}, resource: ${JSON.stringify(
                resource
            )}`
        );
        try {
            resource.commandId = commandId;
            const item = this.assembler.toMessageItem(resource);
            const messageId = await this.service.create(item);

            res.status(201).location(`/messages/${messageId}`).setHeader('x-messageid', messageId);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/messages/:messageId')
    public async getMessage(
        @requestParam('messageId') messageId: string,
        @response() res: Response
    ): Promise<MessageResource> {
        logger.debug(`messages.controller getMessage: in: messageId:${messageId}`);

        let resource: MessageResource;
        try {
            const item = await this.service.getMessage(messageId);
            if (item === undefined) {
                res.status(404);
            } else {
                resource = this.assembler.toMessageResource(item);
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`messages.controller getMessage: exit: ${JSON.stringify(resource)}`);
        return resource;
    }

    @httpGet('/commands/:commandId/messages')
    public async listMessages(
        @requestParam('commandId') commandId: string,
        @queryParam('fromCreatedAtExclusive') fromCreatedAtExclusive: number,
        @queryParam('count') count: number,
        @response() res: Response
    ): Promise<void> {
        logger.debug(
            `messages.controller listMessages: in: commandId:${commandId}, fromCreatedAtExclusive:${fromCreatedAtExclusive}, count:${count}`
        );

        try {
            const [items, paginationKey] = await this.service.listMessages(
                commandId,
                { createdAt: fromCreatedAtExclusive },
                count
            );
            const resources = this.assembler.toMessageListResource(items, count, paginationKey);
            logger.debug(`messages.controller listMessages: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/messages/:messageId/recipients')
    public async listRecipients(
        @requestParam('messageId') messageId: string,
        @queryParam('fromThingNameExclusive') fromThingNameExclusive: string,
        @queryParam('count') count: number,
        @response() res: Response
    ): Promise<void> {
        logger.debug(
            `messages.controller listRecipients: in: messageId:${messageId}, fromThingNameExclusive:${fromThingNameExclusive}, count:${count}`
        );

        try {
            const [items, paginationKey] = await this.service.listRecipients(
                messageId,
                { targetName: fromThingNameExclusive },
                count
            );
            const resources = this.assembler.toRecipientListResource(items, count, paginationKey);
            logger.debug(`messages.controller listRecipients: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/messages/:messageId/recipients/:thingName')
    public async getRecipient(
        @requestParam('messageId') messageId: string,
        @requestParam('thingName') thingName: string,
        @response() res: Response
    ): Promise<Recipient> {
        logger.debug(
            `messages.controller getRecipient: in: messageId:${messageId}, thingName:${thingName}`
        );
        let recipient: Recipient;
        try {
            recipient = await this.service.getRecipient(messageId, thingName);
            if (recipient === undefined) {
                res.status(404);
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`messages.controller getRecipient: exit: ${JSON.stringify(recipient)}`);
        return recipient;
    }

    @httpGet('/messages/:messageId/recipients/:thingName/replies')
    public async listReplies(
        @requestParam('messageId') messageId: string,
        @requestParam('thingName') thingName: string,
        @queryParam('fromReceivedAtExclusive') fromReceivedAtExclusive: number,
        @queryParam('count') count: number,
        @response() res: Response
    ): Promise<void> {
        logger.debug(
            `messages.controller listReplies: in: messageId:${messageId}, thingName:${thingName}, fromReceivedAtExclusive:${fromReceivedAtExclusive}, count:${count}`
        );

        try {
            const [items, paginationKey] = await this.service.listReplies(
                messageId,
                thingName,
                { receivedAt: fromReceivedAtExclusive },
                count
            );
            const resources = this.assembler.toReplyListResource(items, count, paginationKey);
            logger.debug(`messages.controller listReplies: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/messages/:messageId')
    public async delete(
        @requestParam('messageId') messageId: string,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`messages.controller delete: in: messageId:${messageId}`);

        try {
            await this.service.deleteMessage(messageId);
            logger.debug(`messages.controller delete: exit:`);
            res.status(202);
        } catch (e) {
            handleError(e, res);
        }
    }
}
