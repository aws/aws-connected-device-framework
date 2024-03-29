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
import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import {
    CommandListModel,
    CommandModel,
    ExecutionModel,
    ExecutionSummaryListModel,
    RequestHeaders,
} from './commands.model';
import { CommandsService, CommandsServiceBase } from './commands.service';

@injectable()
export class CommandsLambdaService extends CommandsServiceBase implements CommandsService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.COMMANDS_API_FUNCTION_NAME;
    }

    async createCommand(
        command: CommandModel,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandsRelativeUrl())
            .setMethod('POST')
            .setBody(command)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const location = res.header?.location;
        return location.substring(location.lastIndexOf('/') + 1);
    }

    async updateCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(command.commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(command.commandId))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(command);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listCommands(additionalHeaders?: RequestHeaders): Promise<CommandListModel> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandsRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getCommand(
        commandId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<CommandModel> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async uploadCommandFile(
        commandId: string,
        fileId: string,
        fileLocation: string,
        _additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);
        ow(fileLocation, ow.string.nonEmpty);

        // TODO: lambda invocation mode of multi-part file upload
        throw Error('CLIENT NOT IMPLEMENTED');
    }

    async deleteCommandFile(
        commandId: string,
        fileId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandFileRelativeUrl(commandId, fileId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listExecutions(
        commandId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ExecutionSummaryListModel> {
        ow(commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandExecutionsRelativeUrl(commandId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getExecution(
        commandId: string,
        thingName: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandThingExecutionsRelativeUrl(commandId, thingName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async cancelExecution(
        commandId: string,
        thingName: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandThingExecutionsRelativeUrl(commandId, thingName))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
