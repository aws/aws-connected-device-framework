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
    COMMANDANDCONTROL_CLIENT_TYPES,
    CommandsService,
    EditableCommandResource,
    MessagesService,
    NewMessageResource,
} from '@aws-solutions/cdf-commandandcontrol-client';
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';

@injectable()
export class RotateCertificatesJobCustomResource implements CustomResource {
    protected headers: { [key: string]: string };
    private DEFAULT_MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';
    private ROTATE_CERTIFICATES_TEMPLATE_ID = 'RotateCertificates';
    private mimeType: string;

    constructor(
        @inject(COMMANDANDCONTROL_CLIENT_TYPES.CommandsService)
        private commandsService: CommandsService,
        @inject(COMMANDANDCONTROL_CLIENT_TYPES.MessagesService)
        private messagesService: MessagesService
    ) {
        this.mimeType = this.DEFAULT_MIME_TYPE;
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const functionName = customResourceEvent?.ResourceProperties?.FunctionName;
        const thingGroupArn = customResourceEvent?.ResourceProperties?.ThingGroupArn;
        const mqttGetTopic = customResourceEvent?.ResourceProperties?.MQTTGetTopic;
        const mqttAckTopic = customResourceEvent?.ResourceProperties?.MQTTAckTopic;

        ow(functionName, ow.string.nonEmpty);
        ow(thingGroupArn, ow.string.nonEmpty);
        ow(mqttGetTopic, ow.string.nonEmpty);
        ow(mqttAckTopic, ow.string.nonEmpty);

        process.env.COMMANDANDCONTROL_API_FUNCTION_NAME = functionName;
        const thingGroupName = thingGroupArn.split('/')[1];

        const tags = { templateId: this.ROTATE_CERTIFICATES_TEMPLATE_ID };

        const commandResourceList = await this.commandsService.listCommands(tags);

        let existingCommandId;

        if (commandResourceList?.commands?.length < 1) {
            const payload: EditableCommandResource = {
                operation: 'RotateCertificates',
                deliveryMethod: {
                    type: 'JOB',
                    expectReply: true,
                    targetSelection: 'CONTINUOUS',
                    jobExecutionsRolloutConfig: {
                        maximumPerMinute: 120,
                    },
                },
                payloadTemplate:
                    '{"get":{"subscribe":"${getSubscribeTopic}","publish":"${getPublishTopic}"},"ack":{"subscribe":"${ackSubscribeTopic}","publish":"${ackPublishTopic}"}}',
                payloadParams: [
                    'getSubscribeTopic',
                    'getPublishTopic',
                    'ackSubscribeTopic',
                    'ackPublishTopic',
                ],
                tags: {
                    templateId: this.ROTATE_CERTIFICATES_TEMPLATE_ID,
                },
            };

            existingCommandId = await this.commandsService.createCommand(payload);
        } else {
            existingCommandId = commandResourceList.commands[0].id;
        }

        const messageResourceList = await this.messagesService.listMessages(existingCommandId);

        if (messageResourceList?.messages?.length < 1) {
            const oldText = '/+/';
            const newText = '/{thingName}/';
            const getSubscribeTopic = `${mqttGetTopic}/${oldText}/${newText}/+`;
            const getPublishTopic = `${mqttGetTopic}/${oldText}/${newText}`;
            const ackSubscribeTopic = `${mqttAckTopic}/${oldText}/${newText}/+`;
            const ackPublishTopic = `${mqttAckTopic}/${oldText}/${newText}`;

            const payload: NewMessageResource = {
                commandId: existingCommandId,
                targets: {
                    awsIoT: {
                        thingGroups: [{ name: thingGroupName, expand: false }],
                    },
                },
                payloadParamValues: {
                    getSubscribeTopic,
                    getPublishTopic,
                    ackSubscribeTopic,
                    ackPublishTopic,
                },
            };
            await this.messagesService.createMessage(payload);
        }

        return {};
    }

    public async update(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }

    protected getHeaders(): { [key: string]: string } {
        if (this.headers === undefined) {
            const h = {
                Accept: this.mimeType,
                'Content-Type': this.mimeType,
            };
            this.headers = { ...h };
        }
        return this.headers;
    }
}
