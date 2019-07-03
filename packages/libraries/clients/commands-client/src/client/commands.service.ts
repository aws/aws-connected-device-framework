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

import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import config from 'config';
import { CommandModel, CommandListModel, ExecutionSummaryListModel, ExecutionModel } from './commands.model';

@injectable()
export class CommandsService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('commands.baseUrl') as string;

        if (config.has('commands.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('commands.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async createCommand(command:CommandModel): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const res = await request.post(this.baseUrl + '/commands')
            .set(this.headers)
            .send(command);

        const location = res.get('Location');
        return location.substring(location.lastIndexOf('/')+1);
    }

    public async updateCommand(command: CommandModel): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(command.commandId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', command.commandId);

        const res = await request.patch(url)
            .send(command)
            .set(this.headers);

        return res.body;
    }

    public async listCommands(): Promise<CommandListModel> {

        const res = await request.get(this.baseUrl + '/commands')
            .set(this.headers);

        return res.body;
    }

    public async getCommand(commandId:string): Promise<CommandModel> {

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId);
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async uploadCommandFile(commandId:string, fileId:string, fileLocation:string): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);
        ow(fileLocation, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId, 'files', fileId);
        await request.put(url)
            .accept(this.MIME_TYPE)
            .attach('file', fileLocation);
    }

    public async deleteCommandFile(commandId:string, fileId:string): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId, 'files', fileId);

       await request.delete(url)
            .set(this.headers);
    }

    public async listExecutions(commandId:string): Promise<ExecutionSummaryListModel> {
        ow(commandId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId, 'executions');

        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async getExecution(commandId:string, thingName:string): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId, 'executions', thingName);
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async cancelExecution(commandId:string, thingName:string): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('commands', commandId, 'executions', thingName);
        const res = await request.delete(url)
            .set(this.headers);

        return res.body;
    }

}
