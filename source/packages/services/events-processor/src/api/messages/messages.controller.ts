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
import { inject } from 'inversify';
import { controller, httpPost, interfaces, requestBody } from 'inversify-express-utils';
import { TYPES } from '../../di/types';
import { FilterService } from '../../filter/filter.service';
import { DDBStreamTransformer } from '../../transformers/ddbstream.transformer';

@controller('')
export class MessagesController implements interfaces.Controller {
    private _iotData: AWS.IotData;

    constructor(
        @inject(TYPES.DDBStreamTransformer) private transformer: DDBStreamTransformer,
        @inject(TYPES.FilterService) private filter: FilterService,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData,
    ) {
        this._iotData = iotDataFactory();
    }

    /**
     * Note: these are not public endpoints, instead used for debugging purposes
     * by simulating the direct lambda invocation (such as from a dynamodb stream)
     * @param message : lambda event
     */
    @httpPost('/messages/invoke')
    public async simulateMessage(@requestBody() message: unknown): Promise<void> {
        logger.debug(
            `messages.controller simulateMessage: in: message:${JSON.stringify(message)}`,
        );

        // transform the message
        const commonEvents = await this.transformer.transform(message);

        if (commonEvents !== undefined && commonEvents.length > 0) {
            // process the message
            await this.filter.filter(commonEvents);
        }

        logger.debug(`messages.controller simulateMessage: exit:`);
    }

    /**
     * Note: these are not public endpoints, instead used for debugging purposes
     * by simulating an iotcore message
     * @param message : lambda event
     */
    @httpPost('/messages/iotcore')
    public async simulateIoTCoreMessage(
        @requestBody() message: SimulateIoTCoreMessageRequest,
    ): Promise<void> {
        logger.debug(
            `messages.controller simulateIoTCoreMessage: in: message:${JSON.stringify(message)}`,
        );
        const params = {
            topic: message.topic,
            payload: JSON.stringify(message.payload),
            qos: 1,
        };
        await this._iotData.publish(params).promise();
        logger.debug(`messages.controller simulateMessage: exit:`);
    }
}

export interface SimulateIoTCoreMessageRequest {
    topic: string;
    payload: string;
}
