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
    BulkProvisionThingsRequest,
    PROVISIONING_CLIENT_TYPES,
    ThingsService,
} from '@awssolutions/cdf-provisioning-client';

import { logger } from '@awssolutions/simple-cdf-logger';
import { SendMessageResult } from 'aws-sdk/clients/sqs';
import { CommandItem, JobDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { MessagesDao } from '../messages.dao';
import { MessageItem } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class CreateEphemeralGroupAction extends WorkflowPublishAction {
    private iot: AWS.Iot;
    private sqs: AWS.SQS;

    constructor(
        @inject('aws.sqs.queues.messages.queueUrl') private messagesQueueUrl: string,
        @inject('aws.jobs.maxTargets') private maxJobTargets: number,
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS
    ) {
        super();
        this.iot = iotFactory();
        this.sqs = sqsFactory();
    }

    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(
            `workflow.createEphemeralGroup process: in: message:${JSON.stringify(
                message
            )}, command:${JSON.stringify(command)}`
        );

        ow(command, ow.object.nonEmpty);
        const deliveryMethod = command.deliveryMethod as JobDeliveryMethod;
        ow(deliveryMethod.type, ow.string.equals('JOB'));
        ow(message, ow.object.nonEmpty);

        let result = true;

        let resolvedTargets = message.resolvedTargets === undefined ? [] : message.resolvedTargets;

        if (
            resolvedTargets.length > this.maxJobTargets &&
            (await this.isAnExistingBulkProvisioningTaskInProgress())
        ) {
            message.status = 'failed';
            result = false;
            await this.messagesDao.updateMessage(message);
            return result;
        }

        // if the no. devices is greater than the available slots we have, they need flattening into an ephemeral group
        if (resolvedTargets.length > this.maxJobTargets) {
            const thingNames = resolvedTargets.filter((o) => o.type === 'thing');
            const ephemeralGroupResponse = await this.buildEphemeralGroup(
                message.id,
                thingNames.map((t) => t.id)
            );

            // as we have created an ephemeral group from the target, we can remove the things from the resolved targets list
            // TODO: removing resolved targets means their status will never change from 'pending'.
            // This is to address issues with batching. if status is required then a rethink and redesign of job batching is required.
            // As a workaround, if recipient status is needed it can be retrieved directly from the AWS IoT job execution status.
            resolvedTargets = resolvedTargets.filter((o) => o.type !== 'thing');
            resolvedTargets.push({
                id: ephemeralGroupResponse.groupName,
                status: 'pending',
                type: 'thingGroup',
            });

            message.resolvedTargets = resolvedTargets;
            message.bulkProvisioningTaskId = ephemeralGroupResponse.taskId;
            message.status = 'awaiting_provisioning';
        } else {
            message.status = 'sending';
        }

        // as jobs are either targeting <100 things, or targeting an ephemeral group if > 100 targets, there is only 1 batch to process
        message.batchesTotal = 1;
        message.batchesComplete = 0;
        message.updatedAt = new Date().getTime();

        await this.messagesDao.updateMessage(message);
        await this.messagesDao.saveResolvedTargets(message);
        await this.messagesDao.saveBatchProgress(message);

        await this.sqsSendMessage(message, command);

        logger.debug(`workflow.createEphemeralGroup process: exit:${result}`);
        return result;
    }

    private async buildEphemeralGroup(
        messageId: string,
        thingNames: string[]
    ): Promise<EphemeralGroupResponse> {
        logger.debug(
            `workflow.createEphemeralGroup buildEphemeralGroup: messageId:${messageId},  thingNames:${JSON.stringify(
                thingNames
            )}`
        );

        // create the new group
        // TODO: check whether need to sanitize the group name
        const thingGroupName = `cdf-cac-${messageId}`;
        const thingGroupResponse = await this.iot.createThingGroup({ thingGroupName }).promise();

        // add the target things to the group
        const params: BulkProvisionThingsRequest = {
            provisioningTemplateId: process.env.PROVISIONING_TEMPLATES_ADDTHINGTOTHINGGROUP,
            parameters: thingNames.map((thing) => ({
                ThingName: thing,
                ThingGroupName: thingGroupName,
            })),
        };
        const task = await this.thingsService.bulkProvisionThings(params);

        logger.debug(
            `workflow.createEphemeralGroup buildEphemeralGroup: exit:${thingGroupResponse.thingGroupArn}`
        );
        return {
            groupName: thingGroupResponse.thingGroupName,
            taskId: task.taskId,
        };
    }

    private async isAnExistingBulkProvisioningTaskInProgress(): Promise<boolean> {
        logger.debug(
            `workflow.createEphemeralGroup: isAnExistingBulkProvisioningTaskInProgress: in`
        );

        let existingTask = false;
        const params = {
            status: 'InProgress',
        };

        const result = await this.iot.listThingRegistrationTasks(params).promise();
        logger.debug(
            `workflow.createEphemeralGroup: iot:listThingRegistrationTasks: out: ${JSON.stringify(
                result
            )}`
        );

        if (result.taskIds && result.taskIds.length > 0) {
            existingTask = true;
        }

        logger.debug(`workflow.createEphemeralGroup: out: existingTask:${existingTask}`);
        return existingTask;
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

interface EphemeralGroupResponse {
    groupName: string;
    taskId: string;
}
