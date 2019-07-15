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

    constructor( @inject(TYPES.DDBStreamTransformer) private transformer: DDBStreamTransformer,
    @inject(TYPES.FilterService) private filter: FilterService) {}

    /**
     * Note: these are not public endpoints, instead used for debugging purposes
     * by simulating the dynamodb stream > lambda invocation
     * @param message : lambda event
     */
    @httpPost('/messages/ddbstream')
    public async createDdbStreamMessage(@requestBody() message:any) {
        logger.debug(`messages.controller createDdbStreamMessage: in: message:${JSON.stringify(message)}`);

        // transform the message
        const commonEvents = await this.transformer.transform(message);

        if (commonEvents!==undefined && commonEvents.length>0) {
            // process the message
            await this.filter.filter(commonEvents);
        }

        logger.debug(`messages.controller createDdbStreamMessage: exit:`);
    }

}
