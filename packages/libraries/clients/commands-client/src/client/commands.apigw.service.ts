/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

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
