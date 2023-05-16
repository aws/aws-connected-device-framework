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

import { signClientRequest } from '@aws-solutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import {
    CommandResource,
    CommandResourceList,
    EditableCommandResource,
    Tags,
} from './commands.model';
import { CommandsService, CommandsServiceBase } from './commands.service';
import { RequestHeaders } from './common.model';

@injectable()
export class CommandsApigwService extends CommandsServiceBase implements CommandsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.COMMANDANDCONTROL_BASE_URL;
    }

    async createCommand(
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(command, ow.object.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.commandsRelativeUrl()}`)
            .send(command)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.get('x-commandid');
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(commandId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;

        return await request
            .patch(url)
            .send(command)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async createNamedCommand(
        commandId: string,
        command: EditableCommandResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(command, ow.object.nonEmpty);
        ow(commandId, ow.string.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.commandRelativeUrl(commandId)}`)
            .send(command)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.get('x-commandid');
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listCommands(
        tags?: Tags,
        fromCommandIdExclusive?: string,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<CommandResourceList> {
        let url = `${this.baseUrl}${super.commandsRelativeUrl()}`;
        let queryString = QSHelper.getQueryString({ count, fromCommandIdExclusive });
        if (tags && (Object.keys(tags).length ?? 0) > 0) {
            const tagsQS = Object.entries(tags)
                .map(([k, v]) => `tag=${encodeURIComponent(k)}:${encodeURIComponent(v)}`)
                .join('&');
            if (queryString) {
                queryString += `&${tagsQS}`;
            } else {
                queryString = tagsQS;
            }
        }

        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getCommand(
        commandId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<CommandResource> {
        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;
        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
