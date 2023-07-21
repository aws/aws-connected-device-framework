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
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../di/types';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import {
    PkType,
    createDelimitedAttribute,
    createDelimitedAttributePrefix,
    expandDelimitedAttribute,
} from '../utils/pkUtils.util';
import {
    MessageItem,
    MessageListPaginationKey,
    Recipient,
    RecipientListPaginationKey,
    ReplyItem,
    ReplyListPaginationKey,
    TaskBatchProgress,
} from './messages.models';

@injectable()
export class MessagesDao {
    private readonly GSI1 = 'siKey1-sk-index';
    private readonly GSI2 = 'siKey2-siSort2-index';

    private _dc: DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private table: string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async getMessageByCorrelation(
        correlationId: string,
        targetId: string
    ): Promise<MessageItem> {
        logger.debug(
            `messages.dao getMessageByCorrelation: in: correlationId:${correlationId}, targetId${targetId}`
        );

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            IndexName: this.GSI1,
            KeyConditionExpression: `#hash = :hash and #range = :range`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Reply, correlationId),
                ':range': createDelimitedAttribute(PkType.Thing, targetId),
            },
            Select: 'ALL_ATTRIBUTES',
        };

        logger.silly(
            `messages.dao getMessageByCorrelation: QueryInput: ${JSON.stringify(params)}`
        );
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao getMessageByCorrelation: exit: undefined');
            return undefined;
        }

        const message = this.assembleMessage(results.Items[0]);
        logger.debug(
            `messages.dao getMessageByCorrelation: exit: message:${JSON.stringify(message)}`
        );
        return message;
    }

    public async getMessageById(id: string): Promise<MessageItem> {
        logger.debug(`messages.dao getMessageById: in: id:${id}`);

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND begins_with(#sort, :sort)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sort': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Message, id),
                ':sort': createDelimitedAttributePrefix(PkType.Message),
            },
        };

        logger.silly(`messages.dao getMessageById: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao getMessageById: exit: undefined');
            return undefined;
        }

        const message = this.assembleMessage(results.Items[0]);
        logger.debug(`messages.dao getMessageById: exit: message:${JSON.stringify(message)}`);
        return message;
    }

    public async saveMessage(message: MessageItem): Promise<void> {
        logger.debug(`messages.dao saveMessage: in: message:${JSON.stringify(message)}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.table] = [];

        const messageDbId = createDelimitedAttribute(PkType.Message, message.id);

        const messageHeaderDbItem = {
            PutRequest: {
                Item: {
                    pk: messageDbId,
                    sk: messageDbId,
                    siKey2: createDelimitedAttribute(PkType.Command, message.commandId),
                    siSort2: createDelimitedAttribute(PkType.Message, message.createdAt),
                    messageId: message.id,
                    commandId: message.commandId,
                    payloadParamValues: message.payloadParamValues,
                    targets: message.targets,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                },
            },
        };
        if (message.status !== undefined) {
            messageHeaderDbItem.PutRequest.Item['status'] = message.status;
            messageHeaderDbItem.PutRequest.Item['statusMessage'] = message.statusMessage;
        }
        params.RequestItems[this.table] = [messageHeaderDbItem];

        logger.silly(`messages.dao saveMessage: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`messages.dao saveMessage: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(
                `messages.dao saveMessage: has unprocessed items: ${JSON.stringify(
                    r.UnprocessedItems
                )}`
            );
            throw new Error('SAVE_MESSAGE_FAILED');
        }

        logger.debug(`messages.dao save: exit:`);
    }

    public async updateMessage(message: MessageItem): Promise<void> {
        logger.debug(`messages.dao save: in: updateMessage:${JSON.stringify(message)}`);

        const messageDbId = createDelimitedAttribute(PkType.Message, message.id);
        const params: DocumentClient.UpdateItemInput = {
            TableName: this.table,
            Key: {
                pk: messageDbId,
                sk: messageDbId,
            },
            UpdateExpression: '',
            ExpressionAttributeNames: {},
            ExpressionAttributeValues: {},
        };

        Object.keys(message).forEach((k) => {
            if (
                Object.prototype.hasOwnProperty.call(message, k) &&
                k !== 'pk' &&
                k !== 'sk' &&
                k !== 'resolvedTargets' &&
                message[k] !== undefined
            ) {
                if (params.UpdateExpression === '') {
                    params.UpdateExpression += 'set ';
                } else {
                    params.UpdateExpression += ', ';
                }
                params.UpdateExpression += `#${k} = :${k}`;
                params.ExpressionAttributeNames[`#${k}`] = k;
                params.ExpressionAttributeValues[`:${k}`] = message[k];
            }
        });

        logger.silly(`messages.dao updateMessage: params:${JSON.stringify(params)}`);
        const r = await this._dc.update(params).promise();
        logger.silly(`messages.dao updateMessage: r:${JSON.stringify(r)}`);

        logger.debug(`messages.dao updateMessage: exit:`);
    }

    public async saveResolvedTargets(message: MessageItem): Promise<void> {
        logger.debug(`messages.dao saveResolvedTargets: in: message:${JSON.stringify(message)}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.table] = [];

        const messageDbId = createDelimitedAttribute(PkType.Message, message.id);
        if (message.resolvedTargets !== undefined) {
            for (const target of message.resolvedTargets) {
                const targetDbItem = {
                    PutRequest: {
                        Item: {
                            pk: messageDbId,
                            sk: createDelimitedAttribute(PkType.Thing, target.id),
                            siKey2: createDelimitedAttribute(PkType.Thing, target.id),
                            siSort2: createDelimitedAttribute(
                                PkType.Message,
                                new Date().getTime()
                            ),
                            messageId: message.id,
                            targetId: target.id,
                            targetType: target.type,
                            status: target.status,
                            statusMessage: target.statusMessage,
                            createdAt: message.createdAt,
                            updatedAt: message.updatedAt,
                        },
                    },
                };
                if (target.correlationId !== undefined) {
                    targetDbItem.PutRequest.Item['siKey1'] = createDelimitedAttribute(
                        PkType.Reply,
                        target.correlationId
                    );
                    targetDbItem.PutRequest.Item['correlationId'] = target.correlationId;
                }
                if (target.jobId !== undefined) {
                    targetDbItem.PutRequest.Item['jobId'] = target.jobId;
                }

                params.RequestItems[this.table].push(targetDbItem);
            }
        }

        logger.silly(`messages.dao saveResolvedTargets: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`messages.dao saveResolvedTargets: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(
                `messages.dao saveResolvedTargets: has unprocessed items: ${JSON.stringify(
                    r.UnprocessedItems
                )}`
            );
            throw new Error('SAVE_MESSAGE_TARGETS_FAILED');
        }

        logger.debug(`messages.dao saveResolvedTargets: exit:`);
    }

    public async saveBatchProgress(message: MessageItem): Promise<void> {
        logger.debug(`messages.dao saveBatchProgress: in: message:${JSON.stringify(message)}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.table] = [];

        if (message.batchesTotal > 0) {
            const messageDbId = createDelimitedAttribute(PkType.Message, message.id);
            const batchDbId = createDelimitedAttribute(PkType.Message, message.id, 'batches');
            const batchSummaryItem = {
                PutRequest: {
                    Item: {
                        pk: messageDbId,
                        sk: batchDbId,
                        batchesTotal: message.batchesTotal,
                        batchesComplete: message.batchesComplete,
                        createdAt: message.createdAt,
                        updatedAt: message.updatedAt,
                    },
                },
            };
            params.RequestItems[this.table].push(batchSummaryItem);
        }
        logger.silly(`messages.dao saveBatchProgress: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`messages.dao saveBatchProgress: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(
                `messages.dao saveBatchProgress: has unprocessed items: ${JSON.stringify(
                    r.UnprocessedItems
                )}`
            );
            throw new Error('SAVE_MESSAGE_TARGETS_FAILED');
        }

        logger.debug(`messages.dao saveBatchProgress: exit:`);
    }

    public async listMessages(
        commandId: string,
        exclusiveStart?: MessageListPaginationKey,
        count?: number
    ): Promise<[MessageItem[], MessageListPaginationKey]> {
        logger.debug(
            `messages.dao listMessages: in: commandId:${commandId}, exclusiveStart:${JSON.stringify(
                exclusiveStart
            )}, count:${count}`
        );

        const siKey2 = createDelimitedAttribute(PkType.Command, commandId);

        let exclusiveStartKey: DocumentClient.Key;
        if (exclusiveStart?.createdAt !== undefined) {
            exclusiveStartKey = {
                siKey2,
                siSort2: createDelimitedAttribute(PkType.Message, exclusiveStart.createdAt),
            };
        }

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            IndexName: this.GSI2,
            KeyConditionExpression: `#hash = :hash AND begins_with(#sort, :sort)`,
            ExpressionAttributeNames: {
                '#hash': 'siKey2',
                '#sort': 'siSort2',
            },
            ExpressionAttributeValues: {
                ':hash': siKey2,
                ':sort': createDelimitedAttributePrefix(PkType.Message),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`messages.dao listMessages: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao listMessages: exit: [[],undefined]');
            return [[], undefined];
        }

        const messages = this.assembleMessages(results.Items);
        let paginationKey: MessageListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedCreatedAt = Number(
                expandDelimitedAttribute(results.LastEvaluatedKey.sk)[1]
            );
            paginationKey = {
                createdAt: lastEvaluatedCreatedAt,
            };
        }

        logger.debug(
            `messages.dao listMessages: exit: messages:${JSON.stringify(
                messages
            )}, paginationKey:${JSON.stringify(paginationKey)}`
        );
        return [messages, paginationKey];
    }

    public async getRecipient(messageId: string, targetName: string): Promise<Recipient> {
        logger.debug(
            `messages.dao getRecipient: in: messageId:${messageId}, targetName:${targetName}`
        );

        const messageDbId = createDelimitedAttribute(PkType.Message, messageId);
        const targetNameDbId = createDelimitedAttribute(PkType.Thing, targetName);

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND #sort = :sort`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sort': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': messageDbId,
                ':sort': targetNameDbId,
            },
        };

        logger.silly(`messages.dao getRecipient: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao getRecipient: exit: undefined');
            return undefined;
        }

        const recipient = this.assembleRecipient(results.Items[0]);
        logger.debug(`messages.dao getRecipient: exit: message:${JSON.stringify(recipient)}`);
        return recipient;
    }

    public async listRecipients(
        id: string,
        exclusiveStart?: RecipientListPaginationKey,
        count?: number
    ): Promise<[Recipient[], RecipientListPaginationKey]> {
        logger.debug(
            `messages.dao listRecipients: in: id:${id}, exclusiveStart:${JSON.stringify(
                exclusiveStart
            )}, count:${count}`
        );

        const messageDbId = createDelimitedAttribute(PkType.Message, id);

        let exclusiveStartKey: DocumentClient.Key;
        if (exclusiveStart?.targetName) {
            exclusiveStartKey = {
                pk: messageDbId,
                sk: createDelimitedAttribute(PkType.Thing, exclusiveStart.targetName),
            };
        }

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND begins_with(#sort, :sort)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sort': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': messageDbId,
                ':sort': createDelimitedAttributePrefix(PkType.Thing),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`messages.dao listRecipients: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao listRecipients: exit: undefined');
            return [undefined, undefined];
        }

        const recipients = this.assembleRecipients(results.Items);
        let paginationKey: RecipientListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedThingName = expandDelimitedAttribute(
                results.LastEvaluatedKey.sk
            )[1];
            paginationKey = {
                targetName: lastEvaluatedThingName,
            };
        }

        logger.debug(
            `messages.dao listRecipients: exit: recipients:${JSON.stringify(
                recipients
            )}, paginationKey:${JSON.stringify(paginationKey)}`
        );
        return [recipients, paginationKey];
    }

    public async listReplies(
        messageId: string,
        targetName: string,
        exclusiveStart?: ReplyListPaginationKey,
        count?: number
    ): Promise<[ReplyItem[], ReplyListPaginationKey]> {
        logger.debug(
            `messages.dao listReplies: in: messageId:${messageId}, targetName:${targetName}, exclusiveStart:${JSON.stringify(
                exclusiveStart
            )}, count:${count}`
        );

        const messageDbId = createDelimitedAttribute(PkType.Message, messageId);

        let exclusiveStartKey: DocumentClient.Key;
        if (exclusiveStart?.receivedAt) {
            const skDbId = createDelimitedAttribute(
                PkType.Reply,
                PkType.Thing,
                targetName,
                exclusiveStart.receivedAt
            );
            exclusiveStartKey = {
                pk: messageDbId,
                sk: skDbId,
            };
        }

        const params: DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND begins_with(#sort, :sort)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sort': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': messageDbId,
                ':sort': createDelimitedAttributePrefix(PkType.Reply, PkType.Thing, targetName),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`messages.dao listReplies: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count ?? 0) === 0) {
            logger.debug('messages.dao listReplies: exit: undefined');
            return [undefined, undefined];
        }

        const replies = this.assembleReplies(results.Items);
        let paginationKey: ReplyListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedReceivedAt = Number(
                expandDelimitedAttribute(results.LastEvaluatedKey.sk)[3]
            );
            paginationKey = {
                receivedAt: lastEvaluatedReceivedAt,
            };
        }

        logger.debug(
            `messages.dao listReplies: exit: replies:${JSON.stringify(
                replies
            )}, paginationKey:${JSON.stringify(paginationKey)}`
        );
        return [replies, paginationKey];
    }

    public async deleteMessage(messageId: string): Promise<void> {
        logger.debug(`messages.dao deleteMessage: in: messageId:${messageId}`);

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.table] = [];
        const messageDbId = createDelimitedAttribute(PkType.Message, messageId);

        const messageHeaderDbItem = {
            DeleteRequest: {
                Key: {
                    pk: messageDbId,
                    sk: messageDbId,
                },
            },
        };
        params.RequestItems[this.table].push(messageHeaderDbItem);

        const messageBatchDbItem = {
            DeleteRequest: {
                Key: {
                    pk: messageDbId,
                    sk: createDelimitedAttribute(PkType.Message, messageId, 'batches'),
                },
            },
        };
        params.RequestItems[this.table].push(messageBatchDbItem);

        logger.silly(`messages.dao deleteMessage: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`messages.dao deleteMessage: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(
                `messages.dao deleteMessage: has unprocessed items: ${JSON.stringify(
                    r.UnprocessedItems
                )}`
            );
            throw new Error('DELETE_MESSAGE_FAILED');
        }

        logger.debug(`messages.dao deleteMessage: exit:`);
    }

    public async deleteRecipient(messageId: string, targetName: string): Promise<void> {
        logger.debug(
            `messages.dao deleteRecipient: in: messageId:${messageId}, targetName:${targetName}`
        );

        const params: DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.table] = [];

        const messageDbId = createDelimitedAttribute(PkType.Message, messageId);

        // delete the recipient item
        const resolvedTargetDbItem = {
            DeleteRequest: {
                Key: {
                    pk: messageDbId,
                    sk: createDelimitedAttribute(PkType.Thing, targetName),
                },
            },
        };
        params.RequestItems[this.table].push(resolvedTargetDbItem);

        // delete the recipient reply items
        let exclusiveStart: ReplyListPaginationKey;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const r = await this.listReplies(messageId, targetName, exclusiveStart);
            r[0]?.forEach(async (reply) => {
                const replyDbItem = {
                    DeleteRequest: {
                        Key: {
                            pk: reply.pk,
                            sk: reply.sk,
                        },
                    },
                };
                params.RequestItems[this.table].push(replyDbItem);
            });
            exclusiveStart = r[1];
            if (exclusiveStart?.receivedAt === undefined) {
                break;
            }
        }

        logger.silly(`messages.dao deleteRecipient: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`messages.dao deleteRecipient: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(
                `messages.dao deleteRecipient: has unprocessed items: ${JSON.stringify(
                    r.UnprocessedItems
                )}`
            );
            throw new Error('DELETE_RECIPIENT_MESSAGE_FAILED');
        }

        logger.debug(`messages.dao deleteRecipient: exit:`);
    }

    public async incrementBatchesCompleted(messageId: string): Promise<TaskBatchProgress> {
        logger.debug(`messages.dao incrementBatchesCompleted: in: messageId:${messageId}`);

        // validation
        ow(messageId, ow.string.nonEmpty);

        const taskDbId = createDelimitedAttribute(PkType.Message, messageId);
        const batchDbId = createDelimitedAttribute(PkType.Message, messageId, 'batches');

        const params: DocumentClient.UpdateItemInput = {
            TableName: this.table,
            Key: {
                pk: taskDbId,
                sk: batchDbId,
            },
            UpdateExpression: 'set batchesComplete = batchesComplete + :val',
            ExpressionAttributeValues: {
                ':val': 1,
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await this._dc.update(params).promise();
        const response: TaskBatchProgress = {
            complete: result.Attributes['batchesComplete'],
            total: result.Attributes['batchesTotal'],
        };
        logger.debug(`messages.dao incrementBatchesCompleted: exit: ${JSON.stringify(response)}`);
        return response;
    }

    private assembleMessages(items: DocumentClient.AttributeMap[]): MessageItem[] {
        logger.silly(`messages.dao assembleMessages: in: items:${JSON.stringify(items)}`);
        if (items === undefined) {
            return undefined;
        }

        const messages: MessageItem[] = items.map((i) => this.assembleMessage(i));

        logger.silly(`messages.dao assembleMessages: exit:${JSON.stringify(messages)}`);
        return messages;
    }

    private assembleMessage(attrs: DocumentClient.AttributeMap): MessageItem {
        logger.silly(`messages.dao assembleMessage: in: attrs:${JSON.stringify(attrs)}`);
        const r: MessageItem = {
            id: attrs.messageId,
            commandId: attrs.commandId,
            payloadParamValues: attrs.payloadParamValues,
            targets: attrs.targets,
            createdAt: attrs.createdAt,
            updatedAt: attrs.updatedAt,
            status: attrs.status,
            statusMessage: attrs.statusMessage,
        };
        logger.silly(`messages.dao assembleMessage: exit:${JSON.stringify(r)}`);
        return r;
    }

    private assembleRecipients(items: DocumentClient.AttributeMap[]): Recipient[] {
        logger.silly(`messages.dao assembleRecipients: in: items:${JSON.stringify(items)}`);
        if (items === undefined) {
            return undefined;
        }

        const recipients: Recipient[] = items.map((i) => this.assembleRecipient(i));

        logger.silly(`messages.dao assembleRecipients: exit:${JSON.stringify(recipients)}`);
        return recipients;
    }

    private assembleRecipient(attrs: DocumentClient.AttributeMap): Recipient {
        logger.silly(`messages.dao assembleRecipient: in: attrs:${JSON.stringify(attrs)}`);
        const r: Recipient = {
            id: attrs.targetId,
            type: attrs.targetType,
            status: attrs.status,
            statusMessage: attrs.statusMessage,
            correlationId: attrs.correlationId,
            jobId: attrs.jobId,
        };
        logger.silly(`messages.dao assembleRecipient: exit:${JSON.stringify(r)}`);
        return r;
    }

    private assembleReplies(items: DocumentClient.AttributeMap[]): ReplyItem[] {
        logger.silly(`messages.dao assembleReplies: in: items:${JSON.stringify(items)}`);
        if (items === undefined) {
            return undefined;
        }

        const replies: ReplyItem[] = items.map((i) => ({
            receivedAt: new Date(i.createdAt),
            action: i.action,
            payload: i.payload,
            pk: i.pk,
            sk: i.sk,
        }));

        logger.silly(`messages.dao assembleReplies: exit:${JSON.stringify(replies)}`);
        return replies;
    }
}
