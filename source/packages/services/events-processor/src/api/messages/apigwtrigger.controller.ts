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
import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, interfaces, requestBody, response } from 'inversify-express-utils';
import { TYPES } from '../../di/types';
import { CommonEvent } from '../../transformers/transformers.model';
import { handleError } from '../../utils/errors.util';
import { ApigwTriggerService } from './apigwtrigger.service';

@controller('')
export class ApigwTriggerController implements interfaces.Controller {
    constructor(
        @inject(TYPES.ApigwTriggerService) private apigwtriggerService: ApigwTriggerService,
    ) {}

    @httpPost('/messages/apigw')
    public async apigwTrigger(
        @requestBody() event: CommonEvent | string,
        @response() res: Response,
    ): Promise<void> {
        if (typeof event == 'string') {
            logger.debug(`apigwtrigger.controller apigwTrigger: in: event: ${event}`);
        } else {
            logger.debug(
                `apigwtrigger.controller apigwTrigger: in event: ${JSON.stringify(event)}`,
            );
        }

        try {
            if (typeof event == 'string') {
                await this.apigwtriggerService.invoke(JSON.parse(`${event}`));
            } else {
                await this.apigwtriggerService.invoke(event);
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`apigwtrigger.controller apigwTrigger: exit:`);
    }
}
