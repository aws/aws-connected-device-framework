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
import { WorkflowAction } from './workflow.interfaces';
import { injectable } from 'inversify';
import { MessageItem } from '../messages.models';
import { CommandItem } from '../../commands/commands.models';
import { logger } from '../../utils/logger.util';

@injectable()
export class InvalidTransitionAction implements WorkflowAction {

    async process(message:MessageItem,command:CommandItem): Promise<boolean> {
        logger.debug(`workflow.invalidTransition process: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

        return false;
    }

}
