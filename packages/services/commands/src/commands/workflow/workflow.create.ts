/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { WorkflowAction } from './workflow.interfaces';
import { TYPES } from '../../di/types';
import { CommandModel } from '../commands.models';
import { CommandsDao } from '../commands.dao';
import { logger } from '../../utils/logger';
import { injectable, inject } from 'inversify';
import { CommandsValidator } from '../commands.validator';

@injectable()
export class CreateAction implements WorkflowAction {

    constructor(
        @inject(TYPES.CommandsValidator) private commandsValidator: CommandsValidator,
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao) {}

    async execute(existing:CommandModel, updated:CommandModel): Promise<boolean> {
        logger.debug(`workflow.create execute: existing:${JSON.stringify(existing)}, updated:${JSON.stringify(updated)}`);

        this.commandsValidator.validate(updated);

        // save the new job info
        await this.commandsDao.create(updated);

        logger.debug('workflow.create execute: exit:true');
        return true;

    }

}
