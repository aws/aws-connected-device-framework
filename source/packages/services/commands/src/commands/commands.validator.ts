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
import { injectable, inject } from 'inversify';
import { CommandModel } from './commands.models';

import ow from 'ow';
import { TYPES } from '../di/types';
import { RolloutsValidator } from '../rollouts/rollouts.validator';
import { logger } from '../utils/logger';

@injectable()
export class CommandsValidator {

    constructor(
        @inject(TYPES.RolloutsValidator) private rolloutsValidator: RolloutsValidator) {
    }

    public validate(c:CommandModel) : void {
        logger.debug(`commands.validator: validate: in: c:${JSON.stringify(c)}`);
        
        ow(c, ow.object.nonEmpty);
        ow(c.commandId, ow.string.nonEmpty);
        ow(c.templateId, ow.string.nonEmpty);
        
        if (c.type) {
            ow(c.type, ow.string.oneOf(['CONTINUOUS','SNAPSHOT']));
        }

        if (c.commandStatus) {
            ow(c.commandStatus, ow.string.oneOf(['DRAFT','PUBLISHED','CANCELLED']));
        }
        
        if (c.rolloutMaximumPerMinute) {
            ow(c.rolloutMaximumPerMinute, ow.number.integer.inRange(1,1000));
        }

        this.rolloutsValidator.validate(c.jobExecutionsRolloutConfig, c.abortConfig, c.timeoutConfig);

    }

}
