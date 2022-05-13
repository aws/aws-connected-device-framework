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

import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller, httpDelete, httpGet, httpPatch, httpPost, interfaces, queryParam, requestBody, requestParam,
    response
} from 'inversify-express-utils';

import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger.util';
import { CommandsAssembler } from './commands.assembler';
import { CommandResource, CommandResourceList, EditableCommandResource, Tags } from './commands.models';
import { CommandsService } from './commands.service';

@controller('/commands')
export class CommandsController implements interfaces.Controller {

    constructor( 
        @inject(TYPES.CommandsService) private commandsService: CommandsService,
        @inject(TYPES.CommandsAssembler) private commandsAssembler: CommandsAssembler)
         {

        }

    @httpPost('')
    public async createCommand(@requestBody() resource: EditableCommandResource, @response() res: Response) : Promise<void> {
        logger.info(`commands.controller createCommand: in: resource: ${JSON.stringify(resource)}`);
        try {
            const item = this.commandsAssembler.toItem(resource);
            const commandId = await this.commandsService.create(item);

            res.status(201)
                .location(`/commands/${commandId}`)
                .setHeader('x-commandid', commandId);

            logger.debug(`commands.controller createCommand: exit:`);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:commandId')
    public async updateCommand(@requestParam('commandId') commandId:string, @requestBody() resource: EditableCommandResource,
        @response() res: Response) : Promise<void> {
        logger.info(`commands.controller updateCommand: in: resource: ${JSON.stringify(resource)}`);
        try {
            const item = this.commandsAssembler.toItem(resource);
            item.id = commandId;
            await this.commandsService.update(item);
            logger.debug(`commands.controller updateCommand: exit:`);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('')
    public async listCommands(
        @queryParam('tag') tagsQS:string|string[],
        @queryParam('fromCommandIdExclusive') fromCommandIdExclusive: string,
        @queryParam('count') count: number,
        @response() res:Response): Promise<CommandResourceList> {

        logger.info(`commands.controller listCommands: in: tagsQS:${JSON.stringify(tagsQS)}, fromCommandIdExclusive:${fromCommandIdExclusive}, count:${count}`);

        let result:CommandResourceList;
        try {
            let tags:Tags;
            if (typeof tagsQS === 'string') {
                tagsQS = [tagsQS];
            } 
            if ((tagsQS?.length??0)>0) {
                tags= {};
                tagsQS.forEach(t => {
                    const [key, value] = t.split(':');
                    tags[decodeURIComponent(key)] = decodeURIComponent(value);
                });
            }

            const [items,paginationKey] = await this.commandsService.list(tags, {commandId:fromCommandIdExclusive}, count);
            result = this.commandsAssembler.toResourceList(items, count, paginationKey);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`commands.controller listCommands: exit: ${JSON.stringify(result)}`);
        return result;
    }

    @httpGet('/:commandId')
    public async getCommand(@requestParam('commandId') commandId:string, @response() res:Response): Promise<CommandResource> {
        logger.info(`commands.controller getCommand: in: commandId:${commandId}`);

        let command:CommandResource;
        try {
            const item = (await this.commandsService.get([commandId]))?.[0];
            if (item===undefined) {
                res.status(404);
            } 
            command = this.commandsAssembler.toResource(item);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`commands.controller getCommand:  exit: ${JSON.stringify(command)}`);
        return command;
    }

    @httpDelete('/:commandId')
    public async deleteCommand(@requestParam('commandId') commandId:string, @response() res: Response) : Promise<void> {
        logger.info(`commands.controller deleteCommand: in: commandId: ${commandId}`);
        try {
            await this.commandsService.delete(commandId);
            logger.debug(`commands.controller deleteCommand: exit:`);
            res.status(202);
        } catch (e) {
            handleError(e,res);
        }
    }
}
