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

import { IotData } from 'aws-sdk';
import { inject, injectable } from 'inversify';
import ow from 'ow';

import { CommandItem, ShadowDeliveryMethod } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger.util';
import { MessageItem } from '../messages.models';
import { WorkflowPublishAction } from './workflow.publishAction';

@injectable()
export class ShadowAction extends WorkflowPublishAction {

    private iotData: AWS.IotData;

    constructor(
        @inject('aws.iot.shadow.name') private shadowName:string,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData) {
            super();
            this.iotData = iotDataFactory();
        }

    async process(message:MessageItem,command:CommandItem): Promise<boolean> {
        logger.debug(`workflow.shadow process: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

        ow(this.shadowName, ow.string.nonEmpty);
        ow(command, ow.object.nonEmpty);
        const shadowDeliveryMethod = command.deliveryMethod as ShadowDeliveryMethod;
        ow(shadowDeliveryMethod.type, ow.string.equals('SHADOW'));
        ow(message, ow.object.nonEmpty);

        const payload = super.replacePayloadTokens(message,command);
                    
        // enumerate all the targeted things, publishing to device specific topics
        ow(message.resolvedTargets, ow.array.minLength(1));
        for(const target of message.resolvedTargets) {
            target.correlationId = super.uidGenerator();
            try {
                await this.publish(target.thingName, command.operation, target.correlationId, payload);
                target.status = 'success';
            } catch (e) {
                target.status = 'failed';
                target.statusMessage = e.message ?? e.code;
            }

        }

        // we remove the status field to prevent any accidental overwrites when saving to the db in future steps
        delete message.status;

        logger.debug(`workflow.shadow process: exit:true, message:${JSON.stringify(message)}`);
        return true;
    }

    private async publish(thingName:string, operation:string, correlationId: string, payload:unknown) : Promise<void> {
        logger.debug(`workflow.shadow publish: in: thingName:${thingName}, correlationId:${correlationId}, payload:${JSON.stringify(payload)}`);

        const shadowUpdate = {
            state: {
                desired: {}
            },
            clientToken: correlationId
        };
        shadowUpdate.state.desired[operation] = payload;

        const params: IotData.UpdateThingShadowRequest = {
            thingName,
            shadowName: this.shadowName,
            payload: JSON.stringify(shadowUpdate)
        };

        try {
            logger.silly(`workflow.shadow publish: params:${JSON.stringify(params)}`);
            const r = await this.iotData.updateThingShadow(params).promise();
            logger.silly(`workflow.shadow publish: r:${JSON.stringify(r)}`);
        } catch (err) {
            logger.debug(`workflow.shadow publish: err:${err}`);
            throw new Error('UNABLE_TO_UPDATE_SHADOW');
        }
        logger.debug('workflow.shadow publish: exit:');
    }
}
