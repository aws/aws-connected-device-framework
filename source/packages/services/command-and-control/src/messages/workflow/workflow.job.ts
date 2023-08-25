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

import { logger } from '@awssolutions/simple-cdf-logger';
import AWS from 'aws-sdk';
import { CommandItem, JobDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { MessagesDao } from '../messages.dao';
import { MessageItem, Recipient } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class JobAction extends WorkflowPublishAction {
    private iot: AWS.Iot;

    constructor(
        @inject('aws.accountId') private accountId: string,
        @inject('aws.region') private region: string,
        @inject('aws.s3.roleArn') private s3RoleArn: string,
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot
    ) {
        super();
        this.iot = iotFactory();
    }

    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(
            `workflow.job process: in: message:${JSON.stringify(
                message
            )}, command:${JSON.stringify(command)}`
        );

        ow(command, ow.object.nonEmpty);
        const deliveryMethod = command.deliveryMethod as JobDeliveryMethod;
        ow(deliveryMethod.type, ow.string.equals('JOB'));
        ow(message, ow.object.nonEmpty);

        const payload = super.replacePayloadTokens(message, command);

        const msg: MessagePayload = {
            name: command.operation,
            correlationId: this.uidGenerator(),
            payload,
        };

        // build the job target arn list based on resolved targets
        let targetArns: string[] = [];

        targetArns = await this.buildTargetArnList(
            message.id,
            message.resolvedTargets === undefined ? [] : message.resolvedTargets
        );

        // create a new snapshot job
        const jobDeliveryMethod = command.deliveryMethod as JobDeliveryMethod;
        const jobParams: AWS.Iot.CreateJobRequest = {
            jobId: `cdf-cac-${message.id}`,
            targets: targetArns,
            document: JSON.stringify(msg),
            targetSelection: jobDeliveryMethod.targetSelection,
            presignedUrlConfig: {
                expiresInSec: jobDeliveryMethod.presignedUrlConfig?.expiresInSec,
                roleArn: this.s3RoleArn,
            },
        };

        if (jobDeliveryMethod.abortConfig) {
            jobParams.abortConfig = jobDeliveryMethod.abortConfig;
        }

        if (jobDeliveryMethod.jobExecutionsRolloutConfig) {
            jobParams.jobExecutionsRolloutConfig = jobDeliveryMethod.jobExecutionsRolloutConfig;
        }

        if (jobDeliveryMethod.timeoutConfig) {
            jobParams.timeoutConfig = jobDeliveryMethod.timeoutConfig;
        }

        let result = true;
        try {
            logger.silly(`workflow.job process: jobParams:${JSON.stringify(jobParams)}`);
            const jobResponse = await this.iot.createJob(jobParams).promise();
            logger.silly(`workflow.job process: jobResponse:${JSON.stringify(jobResponse)}`);
            message.resolvedTargets.forEach((t) => {
                t.status = 'success';
                t.correlationId = msg.correlationId;
                t.jobId = jobResponse.jobId;
            });

            // we remove the status field to prevent any accidental overwrites when saving to the db in future steps
            delete message.status;
        } catch (err) {
            message.resolvedTargets.forEach((t) => {
                t.status = 'failed';
                t.statusMessage = (<AWS.AWSError>err).message ?? err.code ?? message.statusMessage;
            });
            result = false;
        }

        // TODO: tear down thing group once finished

        await this.messagesDao.updateMessage(message);
        await this.messagesDao.saveResolvedTargets(message);

        logger.debug(`workflow.job process: exit:${result}, message:${JSON.stringify(message)}`);
        return result;
    }

    private async buildTargetArnList(messageId: string, targets: Recipient[]): Promise<string[]> {
        logger.debug(
            `workflow.job buildTargetArnList: messageId:${messageId}, targets:${JSON.stringify(
                targets
            )}`
        );

        ow(targets, ow.array.minLength(1));

        const thingNames = targets.filter((o) => o.type === 'thing');
        const jobTargetArns = thingNames.map((t) => this.thingNameToArn(t.id));

        const thingGroupArns = targets
            .filter((o) => o.type === 'thingGroup')
            .map((t) => this.thingGroupNameToArn(t.id));
        jobTargetArns.push(...thingGroupArns);

        logger.debug(`workflow.job buildTargetArnList: exit:${jobTargetArns}`);
        return jobTargetArns;
    }

    private thingGroupNameToArn(name: string): string {
        return `arn:aws:iot:${this.region}:${this.accountId}:thinggroup/${name}`;
    }

    private thingNameToArn(name: string): string {
        return `arn:aws:iot:${this.region}:${this.accountId}:thing/${name}`;
    }
}

interface MessagePayload {
    name: string;
    payload: unknown;
    correlationId: string;
}
