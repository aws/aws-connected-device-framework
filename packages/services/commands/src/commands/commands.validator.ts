/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
