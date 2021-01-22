/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
