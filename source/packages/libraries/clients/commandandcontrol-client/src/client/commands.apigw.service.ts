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
import request from 'superagent';

import { QSHelper } from '../utils/qs.helper';
import {
    CommandResource, CommandResourceList, EditableCommandResource, Tags
} from './commands.model';
import { CommandsService, CommandsServiceBase } from './commands.service';
import { RequestHeaders } from './common.model';

@injectable()
export class CommandsApigwService extends CommandsServiceBase implements CommandsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.COMMANDANDCONTROL_BASE_URL;
    }

    async createCommand(command: EditableCommandResource, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(command, ow.object.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.commandsRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders))
            .send(command);

        const id = res.get('x-commandid');
        return id;
    }

    async updateCommand(commandId:string, command: EditableCommandResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(command, ow.object.nonEmpty);
        ow(commandId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;

        const res = await request.patch(url)
            .send(command)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listCommands(tags?:Tags, fromCommandIdExclusive?:string, count?:number, additionalHeaders?: RequestHeaders): Promise<CommandResourceList> {

        let url = `${this.baseUrl}${super.commandsRelativeUrl()}`;
        let queryString = QSHelper.getQueryString({count, fromCommandIdExclusive});
        if (tags && (Object.keys(tags).length??0) > 0) {
            const tagsQS = Object.entries(tags).map(([k, v]) => `tag=${encodeURIComponent(k)}:${encodeURIComponent(v)}`).join('&');
            if (queryString) {
                queryString += `&${tagsQS}`;
            } else {
                queryString = tagsQS
            }
        }

        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<CommandResource> {

        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<void> {

        const url = `${this.baseUrl}${super.commandRelativeUrl(commandId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

}
