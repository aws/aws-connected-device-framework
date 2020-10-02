/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This event code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, controller, requestBody, httpPost} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger.util';
import { DDBStreamTransformer } from '../../transformers/ddbstream.transformer';
import { FilterService } from '../../filter/filter.service';

@controller('')
export class MessagesController implements interfaces.Controller {

    private _iotData: AWS.IotData;

    constructor( @inject(TYPES.DDBStreamTransformer) private transformer: DDBStreamTransformer,
    @inject(TYPES.FilterService) private filter: FilterService,
    @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData) {
        this._iotData = iotDataFactory();
    }

    /**
     * Note: these are not public endpoints, instead used for debugging purposes
     * by simulating the direct lambda invocation (such as from a dynamodb stream)
     * @param message : lambda event
     */
    @httpPost('/messages/invoke')
    public async simulateMessage(@requestBody() message:any) {
        logger.debug(`messages.controller simulateMessage: in: message:${JSON.stringify(message)}`);

        // transform the message
        const commonEvents = await this.transformer.transform(message);

        if (commonEvents!==undefined && commonEvents.length>0) {
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
    public async simulateIoTCoreMessage(@requestBody() message:SimulateIoTCoreMessageRequest) {
        logger.debug(`messages.controller simulateIoTCoreMessage: in: message:${JSON.stringify(message)}`);
        const params = {
            topic: message.topic,
            payload: JSON.stringify(message.payload),
            qos: 1
        };
        await this._iotData.publish(params).promise();
        logger.debug(`messages.controller simulateMessage: exit:`);
    }
}

export interface SimulateIoTCoreMessageRequest {
    topic:string;
    payload:string;
}
