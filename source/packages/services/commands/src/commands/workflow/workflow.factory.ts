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
import { CommandStatus } from '../commands.models';
import { logger } from '../../utils/logger';
import { InvalidTransitionAction } from './workflow.invalidTransition';
import { StartJobAction } from './workflow.startjob';
import { CreateAction } from './workflow.create';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../di/types';
import { SaveAction } from './workflow.save';

@injectable()
export class WorkflowFactory {
    constructor(
        @inject(TYPES.InvalidTransitionAction)
        private invalidTransitionAction: InvalidTransitionAction,
        @inject(TYPES.StartJobAction) private startJobAction: StartJobAction,
        @inject(TYPES.SaveAction) private saveAction: SaveAction,
        @inject(TYPES.CreateAction) private createAction: CreateAction,
    ) {}

    getAction(existingStatus: CommandStatus, updatedStatus: CommandStatus): WorkflowAction[] {
        logger.debug(
            `workflow.factory execute: existingStatus:${JSON.stringify(
                existingStatus,
            )}, updatedStatus:${JSON.stringify(updatedStatus)}`,
        );

        // if updated status is undefined, assume no change
        if (updatedStatus === undefined) {
            updatedStatus = existingStatus;
        }

        switch (existingStatus) {
            case CommandStatus.DRAFT:
                switch (updatedStatus) {
                    case CommandStatus.DRAFT:
                        return [this.saveAction];
                    case CommandStatus.PUBLISHED:
                        return [this.startJobAction];
                    case CommandStatus.CANCELLED:
                        // TODO cancel
                        return null;
                    default:
                        return [this.invalidTransitionAction];
                }

            case CommandStatus.PUBLISHED:
                switch (updatedStatus) {
                    case CommandStatus.CANCELLED:
                        // TODO cancel
                        return null;
                    default:
                        return [this.invalidTransitionAction];
                }

            case null:
                // expected when publishing a new command
                switch (updatedStatus) {
                    case CommandStatus.PUBLISHED:
                        return [this.createAction, this.startJobAction];
                    case CommandStatus.DRAFT:
                        return [this.createAction];
                    default:
                        return [this.invalidTransitionAction];
                }

            default:
                return [this.invalidTransitionAction];
        }
    }
}
