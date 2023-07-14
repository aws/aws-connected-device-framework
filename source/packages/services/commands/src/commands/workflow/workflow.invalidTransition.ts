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
import { logger } from '../../utils/logger';
import { CommandModel } from '../commands.models';
import { WorkflowAction } from './workflow.interfaces';

@injectable()
export class InvalidTransitionAction implements WorkflowAction {
    async execute(existing: CommandModel, updated: CommandModel): Promise<boolean> {
        logger.debug(
            `workflow.invalidTransition execute: existing:${JSON.stringify(
                existing,
            )}, updated:${JSON.stringify(updated)}`,
        );

        return false;
    }
}
