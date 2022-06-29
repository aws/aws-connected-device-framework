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
    BulkProvisionThingsRequest, PROVISIONING_CLIENT_TYPES, ThingsService
} from '@cdf/provisioning-client';

import { CommandItem, JobDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger.util';
import { MessageItem, Recipient } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class JobAction extends WorkflowPublishAction {

    private iot: AWS.Iot;

    constructor(
        @inject('aws.accountId') private accountId: string,
        @inject('aws.jobs.maxTargets') private maxJobTargets: number,
        @inject('aws.region') private region: string,
        @inject('aws.s3.roleArn') private s3RoleArn: string,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        super();
        this.iot = iotFactory();
    }

    // TODO: at the moment as the batchTargets command runs prior to this, we end up creating a job for each batch. ideally we should be creating a single job for the entire message. need to think about how we can change this flow.
    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(`workflow.job process: in: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

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

        targetArns = await this.buildTargetArnList(message.id, message.resolvedTargets === undefined ? [] : message.resolvedTargets);

        // create a new snapshot job
        const jobDeliveryMethod = command.deliveryMethod as JobDeliveryMethod;
        const jobParams: AWS.Iot.CreateJobRequest = {
            jobId: `cdf-cac-${message.id}`,
            targets: targetArns,
            document: JSON.stringify(msg),
            targetSelection: jobDeliveryMethod.targetSelection,
            presignedUrlConfig: {
                expiresInSec: jobDeliveryMethod.presignedUrlConfig?.expiresInSec,
                roleArn: this.s3RoleArn
            }
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
            message.resolvedTargets.forEach(t => {
                t.status = 'success';
                t.correlationId = msg.correlationId;
                t.jobId = jobResponse.jobId;
            });

            // we remove the status field to prevent any accidental overwrites when saving to the db in future steps
            delete message.status;
        } catch (err) {
            message.resolvedTargets.forEach(t => {
                t.status = 'failed';
                t.statusMessage = (<AWS.AWSError>err).message ?? err.code ?? message.statusMessage;
            });
            result = false;
        }

        // TODO: tear down thing group once finished

        logger.debug(`workflow.job process: exit:${result}, message:${JSON.stringify(message)}`);
        return result;
    }

    private async buildTargetArnList(messageId: string, targets: Recipient[]): Promise<string[]> {
        logger.debug(`workflow.job buildTargetArnList: messageId:${messageId}, targets:${JSON.stringify(targets)}`);

        ow(targets, ow.array.minLength(1));

        const thingGroupArns = targets.filter(o => o.type === 'thingGroup').map(t => this.thingGroupNameToArn(t.id))

        const thingNames = targets.filter(o => o.type === 'thing')

        // if the no. devices is greater than the available slots we have, they need flattening into an ephemeral group
        let ephemeralGroupArn: string;
        if (targets.length > this.maxJobTargets) {
            ephemeralGroupArn = await this.buildEphemeralGroup(messageId, thingNames.map(t => t.id));
        }

        // TODO: check whether thing names need to be names or arns as job targets
        const jobTargetArns = (ephemeralGroupArn !== undefined) ? [ephemeralGroupArn] : thingNames.map(t => this.thingNameToArn(t.id));

        jobTargetArns.push(...thingGroupArns)

        logger.debug(`workflow.job buildTargetArnList: exit:${jobTargetArns}`);
        return jobTargetArns;
    }

    private async buildEphemeralGroup(messageId: string, thingNames: string[]): Promise<string> {
        logger.debug(`workflow.job buildEphemeralGroup: messageId:${messageId},  thingNames:${JSON.stringify(thingNames)}`);

        // create the new group
        // TODO: check whether neeed to sanitize the group name
        const thingGroupName = `cdf-cac-${messageId}`;
        const thingGroupResponse = await this.iot.createThingGroup({ thingGroupName }).promise();

        // add the target things to the group
        const params: BulkProvisionThingsRequest = {
            provisioningTemplateId: process.env.PROVISIONING_TEMPLATES_ADDTHINGTOTHINGGROUP,
            parameters: thingNames.map(thing => ({ ThingName: thing, ThingGroupName: thingGroupName }))
        };

        // wait until the task is complete
        let task = await this.thingsService.bulkProvisionThings(params);
        task = await this.thingsService.getBulkProvisionTask(task.taskId);
        while (task.status !== 'Completed') {
            if (task.status === 'Failed' || task.status === 'Cancelled' || task.status === 'Cancelling') {
                throw new Error('EPHEMERAL_GROUP_CREATION_FAILURE');
            }
            await new Promise((resolve) => setTimeout(resolve, 2500));
            task = await this.thingsService.getBulkProvisionTask(task.taskId);
        }

        logger.debug(`workflow.job buildEphemeralGroup: exit:${thingGroupResponse.thingGroupArn}`);
        return thingGroupResponse.thingGroupArn;
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