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
    DictionaryArray,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import {
    CommandResource,
    CommandResourceList,
    EditableCommandResource,
    Tags,
} from './commands.model';
import { CommandsService, CommandsServiceBase } from './commands.service';
import { RequestHeaders } from './common.model';

@injectable()
export class CommandsLambdaService extends CommandsServiceBase implements CommandsService {
    private get functionName() {
        return process.env.COMMANDANDCONTROL_API_FUNCTION_NAME;
    }
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private readonly lambdaInvoker: LambdaInvokerService
    ) {
        super();
    }

    async createCommand(
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandsRelativeUrl())
            .setMethod('POST')
            .setBody(command)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const id = res.header?.['x-commandid'];
        return id;
    }

    async updateCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(command);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async createNamedCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(command, ow.object.nonEmpty);
        ow(commandId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('POST')
            .setBody(command)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const id = res.header?.['x-commandid'];
        return id;
    }

    async listCommands(
        tags?: Tags,
        fromCommandIdExclusive?: string,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<CommandResourceList> {
        let qs: DictionaryArray = {};
        if (count) {
            qs.count = [`${count}`];
        }
        if (tags && (Object.keys(tags).length ?? 0) > 0) {
            qs.tag = Object.entries(tags).map(
                ([k, v]) => `${encodeURIComponent(k)}:${encodeURIComponent(v)}`
            );
        }
        qs = {
            ...qs,
            fromCommandIdExclusive: [fromCommandIdExclusive],
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.commandsRelativeUrl())
            .setMultiValueQueryStringParameters(qs)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getCommand(
        commandId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<CommandResource> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.commandRelativeUrl(commandId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
