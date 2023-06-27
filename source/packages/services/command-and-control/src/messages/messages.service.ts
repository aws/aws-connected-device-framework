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

import { SendMessageResult } from 'aws-sdk/clients/sqs';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';

import { CommandsDao } from '../commands/commands.dao';
import { CommandItem } from '../commands/commands.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { MessagesDao } from './messages.dao';
import {
    MessageItem, MessageListPaginationKey, Recipient, RecipientListPaginationKey, ReplyItem, ReplyListPaginationKey
} from './messages.models';
import { WorkflowFactory } from './workflow/workflow.factory';
import { WorkflowAction } from './workflow/workflow.interfaces';
import { InvalidTransitionAction } from './workflow/workflow.invalidTransition';
import ShortUniqueId from 'short-unique-id';
import { ResponseAction } from '../responses/responses.models';

@injectable()
export class MessagesService {
    
    private readonly uidGenerator:ShortUniqueId;
    private sqs: AWS.SQS;
    private iot: AWS.Iot;

    constructor(
        @inject('promises.concurrency') private promisesConcurrency:number,
        @inject('aws.sqs.queues.messages.queueUrl') private messagesQueueUrl:string,
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao,
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(TYPES.WorkflowFactory) private workflowFactory: WorkflowFactory,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
            this.sqs = sqsFactory();
            this.iot = iotFactory();

            this.uidGenerator = new ShortUniqueId({
                dictionary: 'alphanum_lower',
                length: 9,
            });
    }

    public async create(message: MessageItem) : Promise<string> {
        logger.debug(`messages.service: create: in: message: ${JSON.stringify(message)}`);

        ow(message, ow.object.nonEmpty);
        ow(message.commandId, ow.string.nonEmpty);

        message.id = this.uidGenerator();
        message.status = 'identifying_targets';
        message.createdAt = new Date().getTime();

        if (message.targets?.awsIoT?.thingGroups) {
            for(const group of message.targets.awsIoT.thingGroups) {
                ow(group.name,ow.string.nonEmpty)
            }
        }

        const command = (await this.commandsDao.get([message.commandId]))?.[0];
        if (command===undefined) {
            throw new Error(`NOT_FOUND: command with id '${message.commandId}' not found`);
        }

        if (command.payloadParams?.length>0) {
            command.payloadParams.forEach(p=>{
                if (message.payloadParamValues?.[p]===undefined) {
                    throw new Error(`FAILED_VALIDATION: value for command payload parameter '${p}' not provided`);
                }
            });
        }

        // save it
        await this.messagesDao.saveMessage(message);

        // send the task for async processing
        await this.sqsSendMessageForProcessing(message, command);

        logger.debug(`messages.service: create: exit:${message.id}`);
        return message.id;
    }
 
    public async processMessage(message:MessageItem, command:CommandItem): Promise<void> {
      logger.debug(`messages.service: processMessage: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

        let failed=false;
        let failedReason:string;

        try {
            // validation
            ow(message, ow.object.nonEmpty);
            ow(command, ow.object.nonEmpty);

            // determine the action to take based on the type of message
            const actions:WorkflowAction[] = this.workflowFactory.getAction(message, command);

            // perform the actions
            let result=true;
            for (const a of actions) {
                if (!result) {
                    logger.warn(`messages.service: processMessage: breaking from action early`);
                    break;
                }
                if (a instanceof InvalidTransitionAction) {
                    throw new Error('UNSUPPORTED_MESSAGE_TYPE');
                } else {
                    result = result && await a.process(message, command);
                }
            }

            await this.messagesDao.updateMessage(message);
            await this.messagesDao.saveResolvedTargets(message);

            if (result===false) {
                throw new Error('PROCESS_MESSAGE_FAILED');
            }

        } catch (e) {
            logger.error(`messages.service: processMessage: e: ${e.name}: ${e.message}`);
            failed=true;
            failedReason=e.message;   
        } 

        // update the batch and task
        await this.saveBatchStatus(message, failed, failedReason, command.deliveryMethod.expectReply);

        logger.debug(`messages.service: processMessage: exit:`);
    }

    private async saveBatchStatus(message:MessageItem, failed:boolean, failedReason:string, expectReply:boolean): Promise<void> {
        logger.debug(`messages.service saveBatchStatus: in: message:${JSON.stringify(message)}, failed:${failed}, failedReason:${failedReason}`);

        // update the batch progress
        const batchProgress = await this.messagesDao.incrementBatchesCompleted(message.id);

        //  update the task status
        const latest = await this.messagesDao.getMessageById(message.id);
        if (latest!==undefined) {
            // determine if any have failed
            const failedMessages = message.resolvedTargets.filter(d=>d.status==='failed');
            const hasFailed = failedMessages.length>0;

            if (failed===true || hasFailed===true) {
                message.status='failed';
                message.statusMessage = latest.statusMessage ?? failedReason;
                message.updatedAt = new Date().getTime();
            }
            
            // if all batches have been completed, update the overall task state to complete
            if ((batchProgress.complete===batchProgress.total) && message.status!=='failed') {
                if (expectReply===true) {
                    message.status = 'awaiting_replies';
                } else {
                    message.status = 'success';
                }
                message.updatedAt = new Date().getTime();
            }
            await this.messagesDao.updateMessage(message);
            await this.messagesDao.saveBatchProgress(message);
        }

        logger.debug(`messages.service saveBatchStatus: exit:`);
    }

    public async getMessage(messageId: string):Promise<MessageItem> {
        logger.debug(`messages.service getMessage: in:messageId:${messageId}`);

        ow(messageId, ow.string.nonEmpty);

        const message = await this.messagesDao.getMessageById(messageId);
        logger.debug(`messages.service getMessage: exit: ${JSON.stringify(message)}`);
        return message;

    }

    public async listMessages(commandId: string, exclusiveStart?: MessageListPaginationKey, count?: number):Promise<[MessageItem[],MessageListPaginationKey]> {
        logger.debug(`messages.service listMessages: in: commandId:${commandId}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`);

        ow(commandId, ow.string.nonEmpty);

        if (count) {
            count = Number(count);
            ow(count, ow.number.greaterThanOrEqual(1));
        }

        if (exclusiveStart?.createdAt) {
            exclusiveStart.createdAt = Number(exclusiveStart.createdAt);
        }

        const result = await this.messagesDao.listMessages(commandId, exclusiveStart, count);

        logger.debug(`messages.service listMessages: exit: ${JSON.stringify(result)}`);
        return result;

    }

    public async listRecipients(messageId: string, exclusiveStart?: RecipientListPaginationKey, count?: number):Promise<[Recipient[],RecipientListPaginationKey]> {
        logger.debug(`messages.service listRecipients: in: messageId:${messageId}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`);

        ow(messageId, ow.string.nonEmpty);

        if (count) {
            count = Number(count);
            ow(count, ow.number.greaterThanOrEqual(1));
        }

        const result = await this.messagesDao.listRecipients(messageId, exclusiveStart, count);

        logger.debug(`messages.service listRecipients: exit: ${JSON.stringify(result)}`);
        return result;

    }

    public async getRecipient(messageId: string, thingName:string):Promise<Recipient> {
        logger.debug(`messages.service getRecipient: in:messageId:${messageId}, thingName:${thingName}`);

        ow(messageId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const recipient = await this.messagesDao.getRecipient(messageId, thingName);
        logger.debug(`messages.service getRecipient: exit: ${JSON.stringify(recipient)}`);
        return recipient;

    }

    public async listReplies(messageId: string, thingName:string, exclusiveStart?: ReplyListPaginationKey, count?: number):Promise<[ReplyItem[],ReplyListPaginationKey]> {
        logger.debug(`messages.service listReplies: in: messageId:${messageId}, thingName:${thingName}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`);

        ow(messageId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        if (count) {
            count = Number(count);
        }

        // TODO: retrieve message and recipient concurrently to speed things up
        const message = await this.messagesDao.getMessageById(messageId);
        if (message===undefined) {
            throw new Error('NOT_FOUND: Message not found');
        }
        const recipient = await this.messagesDao.getRecipient(messageId, thingName);
        if (recipient===undefined) {
            throw new Error('NOT_FOUND: Recipient not found');
        }
        const command = (await this.commandsDao.get([message.commandId]))?.[0];
        if (command===undefined) {
            throw new Error('NOT_FOUND: Command not found');
        }
        
        // if the command was SHADOW/TOPIC then we retrieve the replies from our own datastore. But if JOB then we need to retrieve them from the job system.
        let result:[ReplyItem[],ReplyListPaginationKey];
        if (command.deliveryMethod.type==='JOB') {
            ow(recipient.jobId, ow.string.nonEmpty);
            const replies:ReplyItem[] = [];
            const r = await this.iot.describeJobExecution({
                thingName,
                jobId: recipient.jobId,
            }).promise();
            // main difference between JOB delivery method and others is that JOB may only have a single reply/payload as not possible to hook into its execution state change events
            if (r.execution) {
                // translate the job execution status to the common statues we use across all delivery methods
                const jobAction = r.execution.status;
                let action:ResponseAction;
                switch (jobAction) {
                    case 'IN_PROGRESS':
                        action = 'accepted';
                        break;
                    case 'SUCCEEDED':
                        action = 'reply';
                        break;
                    case 'FAILED':
                    case 'TIMED_OUT':
                    case 'REJECTED':
                    case 'REMOVED':
                    case 'CANCELED':
                        action = 'rejected';
                        break;
                }
                // remove correlationId if provided as not needed for reply
                let payload = r.execution.statusDetails.detailsMap;
                if (payload) {
                    delete payload.correlationId;
                }
                // to keep things tidy, prefer undefined payload rather than empty json to be consistent with other delivery methods
                if (Object.keys(payload||{}).length===0) {
                    payload = undefined;
                }
                replies.push({
                    receivedAt: r.execution.lastUpdatedAt,
                    action,
                    payload,
                });
            }
            result = [replies, undefined];
        } else {
            result = await this.messagesDao.listReplies(messageId, thingName, exclusiveStart, count);
        }

        logger.debug(`messages.service listReplies: exit: ${JSON.stringify(result)}`);
        return result;

    }

    public async deleteMessage(messageId: string) : Promise<void> {
        logger.debug(`messages.service deleteMessage: in: messageId:${messageId}`);

        await this.sqsSendMessageForDeletion(messageId);

        logger.debug(`messages.service deleteMessage: exit:`);
    }

    public async processMessageDeletion(messageId: string) : Promise<void> {
        logger.debug(`messages.service processMessageDeletion: in: messageId:${messageId}`);
        
        const limit = pLimit(this.promisesConcurrency);
        
        // retrieve all recipients of the message
        let exclusiveStart: RecipientListPaginationKey;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const futures:Promise<SendMessageResult>[]= [];
            const r = await this.listRecipients(messageId, exclusiveStart);            
            r[0]?.forEach(async (recipient) => {
                // delete the recipient, processing a page at a time. this will allow the delete method to be safely rerun in the edge case where deletion of millions of recipients of a message may fail due to exceeding lambda execution time limits
                futures.push( 
                    limit(()=> this.sqsSendRecipientForDeletion(messageId, recipient.id))
                );
            });
            await Promise.all(futures);

            exclusiveStart = r[1];
            if (exclusiveStart?.targetName===undefined) {
                break;
            }
        }

        // delete message
        await this.messagesDao.deleteMessage(messageId);

        logger.debug(`messages.service processMessageDeletion: exit:`);
    }

    public async processRecipientDeletion(messageId: string, thingName: string) : Promise<void> {
        logger.debug(`messages.service processRecipientDeletion: in: messageId:${messageId}, thingName:${thingName}`);

        await this.messagesDao.deleteRecipient(messageId, thingName);

        logger.debug(`messages.service processRecipientDeletion: exit:`);

    }

    private async sqsSendMessageForProcessing(message:MessageItem, command:CommandItem) : Promise<SendMessageResult> {
        return this.sqs.sendMessage({
            QueueUrl: this.messagesQueueUrl,
            MessageBody: JSON.stringify({
                message,
                command,
            }),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: `Message::${message.status}`,
                }
            }
        }).promise();
    }

    private async sqsSendMessageForDeletion(messageId:string) : Promise<SendMessageResult> {
        return this.sqs.sendMessage({
            QueueUrl: this.messagesQueueUrl,
            MessageBody: JSON.stringify({
                messageId,
            }),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: `Message::Delete`,
                }
            }
        }).promise();
    }

    private async sqsSendRecipientForDeletion(messageId:string, thingName:string) : Promise<SendMessageResult> {
        return this.sqs.sendMessage({
            QueueUrl: this.messagesQueueUrl,
            MessageBody: JSON.stringify({
                messageId,
                thingName,
            }),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: `Message::Recipient::Delete`,
                }
            }
        }).promise();
    }

}
