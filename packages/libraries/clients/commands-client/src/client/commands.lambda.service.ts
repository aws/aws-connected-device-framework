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

import {injectable, inject} from 'inversify';
import ow from 'ow';
import {
    CommandListModel,
    CommandModel,
    ExecutionModel,
    ExecutionSummaryListModel,
    RequestHeaders,
} from './commands.model';
import {CommandsService, CommandsServiceBase} from './commands.service';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService, LambdaApiGatewayEventBuilder} from '@cdf/lambda-invoke';

@injectable()
export class CommandsLambdaService extends CommandsServiceBase implements CommandsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('commands.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandsRelativeUrl())
            .setMethod('GET')
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
            .setBody(command)
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

    async getCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<CommandModel> {

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async uploadCommandFile(commandId: string, fileId: string, fileLocation: string, _additionalHeaders?: RequestHeaders): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);
        ow(fileLocation, ow.string.nonEmpty);

        // TODO: lambda invocation mode of multi-part file upload
        throw Error('CLIENT NOT IMPLEMENTED');
    }

    async deleteCommandFile(commandId: string, fileId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(commandId, ow.string.nonEmpty);
        ow(fileId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandFileRelativeUrl(commandId, fileId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listExecutions(commandId: string, additionalHeaders?: RequestHeaders): Promise<ExecutionSummaryListModel> {
        ow(commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandExecutionsRelativeUrl(commandId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel> {
        ow(commandId, ow.string.nonEmpty);
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandThingExecutionsRelativeUrl(commandId, thingName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async cancelExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel> {
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
