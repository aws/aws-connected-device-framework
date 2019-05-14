/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { WorkflowAction } from './workflow.interfaces';
import { CommandModel } from '../commands.models';
import { logger } from '../../utils/logger';
import { injectable } from 'inversify';

@injectable()
export class InvalidTransitionAction implements WorkflowAction {

    async execute(existing:CommandModel, updated:CommandModel): Promise<boolean> {
        logger.debug(`workflow.invalidTransition execute: existing:${JSON.stringify(existing)}, updated:${JSON.stringify(updated)}`);

        return false;
    }

}
