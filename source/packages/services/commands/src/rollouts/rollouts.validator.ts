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
import { AbortConfig, JobExecutionsRolloutConfig, TimeoutConfig } from '../commands/commands.models';

@injectable()
export class RolloutsValidator {

    public validate(
        jobExecutionsRolloutConfig: JobExecutionsRolloutConfig,
        abortConfig: AbortConfig,
        timeoutConfig: TimeoutConfig) : void {

        const jerc = jobExecutionsRolloutConfig;
        if (jerc) {
            const er = jerc.exponentialRate;
            if (er) {
                ow(er.baseRatePerMinute, ow.number.integer.inRange(1,1000));
                ow(er.incrementFactor, ow.number.inRange(1,5));
                if (er.rateIncreaseCriteria) {
                    if (er.rateIncreaseCriteria.numberOfNotifiedThings) {
                        ow(er.rateIncreaseCriteria.numberOfNotifiedThings, ow.number.integer.greaterThanOrEqual(1));
                    }
                    const ric = er.rateIncreaseCriteria;
                    if (ric.numberOfSucceededThings) {
                        ow(ric.numberOfSucceededThings, ow.number.integer.greaterThanOrEqual(1));
                    }
                }
            }
            if (jerc.maximumPerMinute) {
                ow(jerc.maximumPerMinute, ow.number.integer.inRange(1,1000));
            }

            ow(abortConfig, ow.object.nonEmpty.message('The abortConfig must be provided if jobExecutionRolloutConfig is provided.'));
            ow(abortConfig.criteriaList, ow.array.nonEmpty.minLength(1));
            for(const cl of abortConfig.criteriaList) {
                ow(cl.action, ow.string.equals('CANCEL'));
                ow(cl.failureType, ow.string.oneOf(['FAILED','REJECTED','TIMED_OUT','ALL']));
                ow(cl.minNumberOfExecutedThings, ow.number.integer.greaterThanOrEqual(1));
                ow(cl.thresholdPercentage, ow.number.inRange(0.1, 100));
            }
        }

        if (timeoutConfig?.inProgressTimeoutInMinutes) {
            ow(timeoutConfig?.inProgressTimeoutInMinutes, ow.number.integer.inRange(1,10080));
        }
    }

}
