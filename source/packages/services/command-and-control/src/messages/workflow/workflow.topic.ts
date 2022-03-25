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

import { CommandItem, TopicDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger.util';
import { MessageItem } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class TopicAction extends WorkflowPublishAction {

    private iotData: AWS.IotData;

    constructor(
        @inject('deliveryMethod.topic.mqttTopic') private topic: string,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData) {
        super();
        this.iotData = iotDataFactory();
    }

    async process(message:MessageItem,command:CommandItem): Promise<boolean> {
        logger.debug(`workflow.topic process: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

        ow(command, ow.object.plain);
        const topicDeliveryMethod = command.deliveryMethod as TopicDeliveryMethod;
        ow(topicDeliveryMethod.type, ow.string.equals('TOPIC'));
        ow(this.topic, ow.string.nonEmpty);
        ow(message, ow.object.plain);

        const payload = super.replacePayloadTokens(message,command);

        const msg:MessagePayload = {
            operation: command.operation,
            payload,
        };
        
        // if there are no tokens to be replaced in the topic, its a shared topic
        const isSharedTopic = this.topic.indexOf('${')<0;

        if (isSharedTopic) {

            // expecting a reply is not supported if sending to a shared topic as that would
            // require message specific correlation info to be sent as part of the payload
            ow(topicDeliveryMethod.expectReply, ow.boolean.false);

            // targeting specific things cannot be supported for shared topics either
            ow(message.resolvedTargets?.length??0, 'targets', ow.number.equal(0));

            // send message to the shared topic
            await this.publish(this.topic, msg);

        } else {
            
            // TODO: validate message has all required payload params identified/provided
            
            // enumerate all the targeted things, publishing to device specific topics
            ow(message.resolvedTargets, ow.array.minLength(1));
            for(const target of message.resolvedTargets) {
                target.correlationId = super.uidGenerator();
                msg.correlationId = target.correlationId
                const thingTopic = this.topic.replace(/\$\{thingName\}/g, target.thingName);
                msg.topics = {
                    accepted: `${thingTopic}/${target.correlationId}/accepted`,
                    rejected: `${thingTopic}/${target.correlationId}/rejected`
                };
                if (command.deliveryMethod.expectReply===true) {
                    // if expecting reply, then build thing specific payloads including correlation info
                    msg.topics.reply = `${thingTopic}/${target.correlationId}/reply`;
                }
                if (topicDeliveryMethod.onlineOnly===true) {
                    // TODO: verify that device is online before sending
                }
                // TODO: support other topic params?

                try {
                    await this.publish(thingTopic, msg);
                    target.status = 'success';
                } catch (e) {
                    target.status = 'failed';
                    target.statusMessage = e.message ?? e.code;
                }
            }
        }

        // we remove the status field to prevent any accidental overwrites when saving to the db in future steps
        delete message.status;
        
        logger.debug(`workflow.topic process: exit:true, message:${JSON.stringify(message)}`);
        return true;
    }

    private async publish(topic:string, payload:MessagePayload) : Promise<void> {
        logger.debug(`workflow.topic publish: in: topic:${topic}, payload:${JSON.stringify(payload)}`);

        const params = {
            topic,
            payload: JSON.stringify(payload),
            qos: 1
        };

        try {
            await this.iotData.publish(params).promise();
        } catch (err) {
            logger.debug(`workflow.topic publish: err:${err}`);
            throw new Error('UNABLE_TO_PUBLISH_MQTT_MESSAGE');
        }
        logger.debug('workflow.topic publish: exit:');
    }
}

interface MessagePayload {
    operation: string;
    payload: unknown;
    correlationId?: string;
    topics?: {
        accepted: string;
        rejected: string;
        reply?: string;
    }
}