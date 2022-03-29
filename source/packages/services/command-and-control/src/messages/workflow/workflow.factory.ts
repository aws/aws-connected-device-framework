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
import ow from 'ow';

import { CommandItem } from '../../commands/commands.models';
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger.util';
import { MessageItem } from '../messages.models';
import { WorkflowAction } from './workflow.interfaces';
import { InvalidTransitionAction } from './workflow.invalidTransition';
import { ShadowAction } from './workflow.shadow';
import { TopicAction } from './workflow.topic';
import { ResolveTargetsAction } from './workflow.resolveTargets';
import { BatchTargetsAction } from './workflow.batchTargets';
import { JobAction } from './workflow.job';

@injectable()
export class WorkflowFactory {

    constructor(
        @inject(TYPES.ResolveTargetsAction) private resolveTargetsAction: ResolveTargetsAction,
        @inject(TYPES.BatchTargetsAction) private batchTargetsAction:BatchTargetsAction,
        @inject(TYPES.TopicAction) private topicAction: TopicAction,
        @inject(TYPES.ShadowAction) private shadowAction: ShadowAction,
        @inject(TYPES.JobAction) private jobAction: JobAction,
        @inject(TYPES.InvalidTransitionAction) private invalidTransitionAction: InvalidTransitionAction) {

        }

    getAction(message:MessageItem, command:CommandItem): WorkflowAction[] {
        logger.debug(`workflow.factory getAction: message:${JSON.stringify(message)}, command:${JSON.stringify(command)}`);

        ow(message, ow.object.nonEmpty);
        ow(command?.deliveryMethod?.type, ow.string.oneOf(['TOPIC', 'SHADOW', 'JOB']));

        switch (message.status) {

            case 'identifying_targets': {
                return [this.resolveTargetsAction, this.batchTargetsAction];
            }

            case 'sending': {

                switch (command.deliveryMethod.type) {
                    case 'TOPIC': {
                        return [this.topicAction ];
                    }
                    case 'JOB': {
                        return [this.jobAction];
                    }
                    case 'SHADOW': {
                        return [this.shadowAction ];
                    }
                    default:
                        return [this.invalidTransitionAction];
                }
                
            }

            default:
                return [this.invalidTransitionAction];
        }
    }
}
