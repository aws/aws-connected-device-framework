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
import { SendMessageResult } from 'aws-sdk/clients/sqs';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';
import { CommandItem, DeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { MessagesDao } from '../messages.dao';
import { MessageItem } from '../messages.models';
import { WorkflowAction } from './workflow.interfaces';

@injectable()
export class BatchTargetsAction implements WorkflowAction {
    private sqs: AWS.SQS;

    constructor(
        @inject('aws.sqs.queues.messages.queueUrl') private messagesQueueUrl: string,
        @inject('aws.sqs.queues.messages.topic.batchSize') private topicMessagesBatchSize: number,
        @inject('aws.sqs.queues.messages.shadow.batchSize')
        private shadowMessagesBatchSize: number,
        @inject('aws.sqs.queues.messages.job.batchSize') private jobMessagesBatchSize: number,
        @inject('promises.concurrency') private promisesConcurrency: number,
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS
    ) {
        this.sqs = sqsFactory();
    }

    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(
            `workflow.batchTargets process: message:${JSON.stringify(
                message
            )}, command:${JSON.stringify(command)}`
        );

        ow(command, ow.object.plain);
        ow(message, ow.object.plain);

        // there could be 1000's of expanded targets to process, therefore split into batches for more efficient processing
        const batcher = <T>(items: T[]) =>
            items.reduce((chunks: T[][], item: T, index) => {
                const chunk = Math.floor(index / this.getBatchSize(command.deliveryMethod.type));
                chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                return chunks;
            }, []);
        const batches = batcher(message.resolvedTargets);
        message.batchesTotal = batches.length;
        message.batchesComplete = 0;
        message.status = 'sending';
        await this.messagesDao.saveMessage(message);
        await this.messagesDao.saveBatchProgress(message);

        // send each batch of deployments to sqs for async processing
        const sqsFutures: Promise<SendMessageResult>[] = [];
        const limit = pLimit(this.promisesConcurrency);
        for (const batch of batches) {
            // replace full list of resolved targets with the batch, so the message item now represents a batch
            message.resolvedTargets = batch;
            sqsFutures.push(limit(() => this.sqsSendMessage(message, command)));
        }
        await Promise.all(sqsFutures);

        logger.debug('workflow.batchTargets process: exit:true');
        return true;
    }

    private getBatchSize(deliveryMethod: DeliveryMethod): number {
        switch (deliveryMethod) {
            case 'JOB':
                return this.jobMessagesBatchSize;
            case 'TOPIC':
                return this.topicMessagesBatchSize;
            case 'SHADOW':
                return this.shadowMessagesBatchSize;
        }
    }

    private async sqsSendMessage(
        message: MessageItem,
        command: CommandItem
    ): Promise<SendMessageResult> {
        return this.sqs
            .sendMessage({
                QueueUrl: this.messagesQueueUrl,
                MessageBody: JSON.stringify({
                    message,
                    command,
                }),
                MessageAttributes: {
                    messageType: {
                        DataType: 'String',
                        StringValue: `Message::${message.status}`,
                    },
                },
            })
            .promise();
    }
}
