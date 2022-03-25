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
import ow from 'ow';
import ShortUniqueId from 'short-unique-id';

import { CommandItem } from '../../commands/commands.models';
import { MessageItem } from '../messages.models';
import { WorkflowAction } from './workflow.interfaces';

@injectable()
export abstract class WorkflowPublishAction implements WorkflowAction {

    protected readonly uidGenerator:ShortUniqueId;

    constructor() {
        this.uidGenerator = new ShortUniqueId({
            dictionary: 'alphanum_lower',
            length: 9,
        });
    }

    abstract process(message:MessageItem,command:CommandItem): Promise<boolean>;

    protected replacePayloadTokens(message:MessageItem,command:CommandItem) : string {
        ow(message, ow.object.nonEmpty);
        ow(command, ow.object.nonEmpty);

        let payload;
        if (command.payloadTemplate) {
            let payloadString = JSON.stringify(command.payloadTemplate);
            if (message.payloadParamValues!==undefined) {
                Object.keys(message.payloadParamValues).forEach(k => {
                    const token = '${' + k + '}';
                    payloadString = payloadString.split(token).join(message.payloadParamValues[k] as string);
                });
            }
            payload = JSON.parse(payloadString);
        }
        return payload;
    }

}
