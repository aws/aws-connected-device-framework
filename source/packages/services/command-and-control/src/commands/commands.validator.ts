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

import { injectable } from 'inversify';
import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';
import { CommandItem, JobDeliveryMethod, TopicDeliveryMethod } from './commands.models';

@injectable()
export class CommandsValidator {

    public validate(c: CommandItem): void {
        logger.debug(`commands.validator: validate: in: c:${JSON.stringify(c)}`);

        ow(c, ow.object.nonEmpty);
        ow(c.id, ow.string.nonEmpty);
        ow(c.operation, ow.string.nonEmpty);

        ow(c.deliveryMethod?.type, ow.string.oneOf(['JOB', 'TOPIC', 'SHADOW']));
        ow(c.deliveryMethod?.expectReply, ow.boolean);

        switch (c.deliveryMethod.type) {
            case 'TOPIC': {
                const dm = c.deliveryMethod as TopicDeliveryMethod;
                ow(dm.onlineOnly, 'onlineOnly', ow.boolean);
                break;
            }
            case 'SHADOW': {
                // no additional validation required
                break;
            }
            case 'JOB': {
                const dm = c.deliveryMethod as JobDeliveryMethod;
                const exponentialRate = dm.jobExecutionsRolloutConfig?.exponentialRate;

                ow(dm.targetSelection, ow.string.oneOf(['CONTINUOUS', 'SNAPSHOT']))

                if (exponentialRate) {
                    ow(exponentialRate.baseRatePerMinute, ow.number.greaterThan(0));
                    ow(exponentialRate.incrementFactor, ow.number.greaterThan(0));
                    ow(exponentialRate.rateIncreaseCriteria, ow.object.nonEmpty);
                }
                const abortConfig = dm.abortConfig;
                if (abortConfig) {
                    ow(abortConfig.criteriaList, ow.array.minLength(1));
                }
                const timeoutConfig = dm.timeoutConfig;
                if (timeoutConfig) {
                    ow(timeoutConfig.inProgressTimeoutInMinutes, ow.number.greaterThan(0));
                }
                break;
            }
        }

    }

}
