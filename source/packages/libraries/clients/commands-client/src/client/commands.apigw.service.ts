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
import {injectable} from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import config from 'config';
import {
    CommandListModel,
    CommandModel,
    ExecutionModel,
    ExecutionSummaryListModel,
    RequestHeaders,
} from './commands.model';
import {CommandsService, CommandsServiceBase} from './commands.service';

@injectable()
export class CommandsApigwService extends CommandsServiceBase implements CommandsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('commands.baseUrl') as string;
    }

    async createCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.commandsRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders))
            .send(command);

        const location = res.get('Location');
        return location.substring(location.lastIndexOf('/') + 1);
    }

    async updateCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(command.commandId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandRelativeUrl(command.commandId)}`;

        const res = await request.patch(url)
            .send(command)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listCommands(additionalHeaders?: RequestHeaders): Promise<CommandListModel> {

        const res = await request.get(`${this.baseUrl}${super.commandsRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<CommandModel> {

        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async uploadCommandFile(commandId: string, fileId: string, fileLocation: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);
        ow(fileLocation, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandFileRelativeUrl(commandId, fileId)}`;
        await request.put(url)
            .set(this.buildHeaders(additionalHeaders))
            .attach('file', fileLocation);
    }

    async deleteCommandFile(commandId: string, fileId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandFileRelativeUrl(commandId, fileId)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listExecutions(commandId: string, additionalHeaders?: RequestHeaders): Promise<ExecutionSummaryListModel> {
        ow(commandId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandExecutionsRelativeUrl(commandId)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandThingExecutionsRelativeUrl(commandId, thingName)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async cancelExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandThingExecutionsRelativeUrl(commandId, thingName)}`;
        const res = await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

}
