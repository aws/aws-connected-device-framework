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

import { logger } from '@awssolutions/simple-cdf-logger';
import {
    Recipient,
    RecipientList,
    RecipientListPaginationKey,
    ReplyListPaginationKey,
    ReplyResourceList,
    MessageItem,
    MessageListPaginationKey,
    MessageResourceList,
    NewMessageResource,
    ReplyItem,
    MessageResource,
} from './messages.models';

@injectable()
export class MessagesAssembler {
    public toMessageItem(resource: NewMessageResource): MessageItem {
        logger.debug(`messages.assembler toMessageItem: in: resource:${JSON.stringify(resource)}`);

        const item: MessageItem = {
            commandId: resource.commandId,
            payloadParamValues: resource.payloadParamValues,
            targets: {},
        };

        if (resource.targets?.awsIoT) {
            item.targets.awsIoT = {
                thingNames: resource.targets.awsIoT?.thingNames,
                thingGroups: resource.targets.awsIoT?.thingGroups?.map((o) => {
                    return {
                        name: o.name,
                        expand: o.expand === undefined ? true : o.expand,
                    };
                }),
            };
        }

        if (resource.targets?.assetLibrary) {
            item.targets.assetLibrary = {
                deviceIds: resource.targets.assetLibrary.deviceIds,
                groupPaths: resource.targets.assetLibrary.groupPaths,
                query: resource.targets.assetLibrary.query,
            };
        }

        logger.debug(`messages.assembler toMessageItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toMessageResource(item: MessageItem): MessageResource {
        logger.debug(`messages.assembler toMessageResource: in: item:${JSON.stringify(item)}`);

        const r: MessageResource = {
            commandId: item.commandId,
            payloadParamValues: item.payloadParamValues,
            targets: {},
            id: item.id,
            status: item.status,
            updatedAt: new Date(item.updatedAt),
            createdAt: new Date(item.createdAt),
        };

        if (item.targets?.awsIoT) {
            r.targets.awsIoT = {
                thingNames: item.targets.awsIoT.thingNames,
                thingGroups: item.targets.awsIoT.thingGroups,
            };
        }

        if (item.targets?.assetLibrary) {
            r.targets.assetLibrary = {
                deviceIds: item.targets.assetLibrary.deviceIds,
                groupPaths: item.targets.assetLibrary.groupPaths,
                query: item.targets.assetLibrary.query,
            };
        }

        logger.debug(`messages.assembler toMessageResource: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public toMessageListResource(
        items: MessageItem[],
        count?: number,
        paginateFrom?: MessageListPaginationKey,
    ): MessageResourceList {
        logger.debug(
            `messages.assembler toMessageListResource: in: items:${JSON.stringify(
                items,
            )}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`,
        );

        const list: MessageResourceList = {
            messages: [],
        };

        if (items === undefined) return list;

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                createdAt: paginateFrom?.createdAt,
            };
        }

        list.messages = items.map((i) => this.toMessageResource(i));

        logger.debug(`messages.assembler toMessageListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }

    public toRecipientListResource(
        items: Recipient[],
        count?: number,
        paginateFrom?: RecipientListPaginationKey,
    ): RecipientList {
        logger.debug(
            `messages.assembler toRecipientListResource: in: items:${JSON.stringify(
                items,
            )}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`,
        );

        const list: RecipientList = {
            recipients: [],
        };

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                thingName: paginateFrom?.targetName,
            };
        }

        list.recipients = items;

        logger.debug(`messages.assembler toRecipientListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }

    public toReplyListResource(
        items: ReplyItem[],
        count?: number,
        paginateFrom?: ReplyListPaginationKey,
    ): ReplyResourceList {
        logger.debug(
            `messages.assembler toReplyListResource: in: items:${JSON.stringify(
                items,
            )}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`,
        );

        const list: ReplyResourceList = {
            replies: [],
        };

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                receivedAt: paginateFrom?.receivedAt,
            };
        }

        if (items !== undefined) {
            list.replies = items.map((i) => ({
                receivedAt: i.receivedAt,
                payload: i.payload,
                action: i.action,
            }));
        }

        logger.debug(`messages.assembler toReplyListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }
}
