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

import { PROVISIONING_CLIENT_TYPES, ThingsService } from '@awssolutions/cdf-provisioning-client';

import { logger } from '@awssolutions/simple-cdf-logger';
import { SendMessageResult } from 'aws-sdk/clients/sqs';
import { CommandItem, JobDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { MessagesDao } from '../messages.dao';
import { MessageItem } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class CheckBulkProvisioningAction extends WorkflowPublishAction {
    private sqs: AWS.SQS;

    constructor(
        @inject('aws.sqs.queues.messages.queueUrl') private messagesQueueUrl: string,
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS
    ) {
        super();
        this.sqs = sqsFactory();
    }

    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(
            `workflow.checkBulkProvisioningAction process: in: message:${JSON.stringify(
                message
            )}, command:${JSON.stringify(command)}`
        );

        ow(command, ow.object.nonEmpty);
        const deliveryMethod = command.deliveryMethod as JobDeliveryMethod;
        ow(deliveryMethod.type, ow.string.equals('JOB'));
        ow(message, ow.object.nonEmpty);

        let result: boolean;

        const task = await this.thingsService.getBulkProvisionTask(message.bulkProvisioningTaskId);
        logger.debug(
            `workflow.checkBulkProvisioningAction: thingService.getBulkProvisioningTask: ${JSON.stringify(
                task
            )}`
        );

        // check if the status is one of the below and stop retrying Failed, Cancelled, Cancelling
        if (
            task === undefined ||
            task.status === 'Failed' ||
            task.status === 'Cancelled' ||
            task.status === 'Cancelling'
        ) {
            logger.debug(
                `workflow.checkBulkProvisioningAction: taskStatus is one of Failed, Cancelled, Cancelling: TaskStatus: ${task.status}`
            );
            result = true;
            message.status = 'failed';
            await this.messagesDao.updateMessage(message);
        } else if (task.status === 'Completed') {
            logger.debug(
                `workflow.checkBulkProvisioningAction: taskStatus is completed: TaskStatus: ${task.status}`
            );
            result = true;
            message.status = 'sending';
            await this.messagesDao.updateMessage(message);
            await this.sqsSendMessage(message, command);
        } else {
            logger.debug(
                `workflow.checkBulkProvisioningAction: taskStatus is inProgress: TaskStatus: ${task.status}`
            );
            // retry the message
            result = true;
            await this.sqsSendMessage(message, command);
        }

        logger.debug(`workflow.checkBulkProvisioningAction process: exit:${result}`);
        return result;
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
                DelaySeconds: 30,
            })
            .promise();
    }
}
