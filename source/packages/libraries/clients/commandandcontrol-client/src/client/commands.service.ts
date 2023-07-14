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
import { PathHelper } from '../utils/path.helper';
import {
    CommandResource,
    CommandResourceList,
    EditableCommandResource,
    Tags,
} from './commands.model';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';

export interface CommandsService {
    createCommand(
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string>;
    createNamedCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string>;
    updateCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;
    listCommands(
        tags?: Tags,
        fromCommandIdExclusive?: string,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<CommandResourceList>;
    getCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<CommandResource>;
    deleteCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class CommandsServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected commandsRelativeUrl(): string {
        return '/commands';
    }

    protected commandRelativeUrl(commandId: string): string {
        return PathHelper.encodeUrl('commands', commandId);
    }
}
