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
import { inject, injectable } from 'inversify';
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';
import { CommandsDao } from '../commands.dao';
import { CommandModel } from '../commands.models';
import { CommandsValidator } from '../commands.validator';
import { WorkflowAction } from './workflow.interfaces';

@injectable()
export class SaveAction implements WorkflowAction {
    constructor(
        @inject(TYPES.CommandsValidator) private commandsValidator: CommandsValidator,
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao
    ) {}

    async execute(existing: CommandModel, updated: CommandModel): Promise<boolean> {
        logger.debug(
            `workflow.save execute: existing:${JSON.stringify(existing)}, updated:${JSON.stringify(
                updated
            )}`
        );

        this.commandsValidator.validate(updated);

        // save the updated job info
        await this.commandsDao.update(updated);

        logger.debug('workflow.save execute: exit:true');
        return true;
    }
}
