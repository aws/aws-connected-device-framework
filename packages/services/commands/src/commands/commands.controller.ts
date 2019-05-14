/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response, Request } from 'express';
import { interfaces, controller, response, httpPost, requestBody, httpPatch, requestParam, httpGet, httpPut, request, httpDelete, queryParam} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import { CommandsService } from './commands.service';
import { CommandModel, CommandListModel, ExecutionStatus } from './commands.models';
import * as Busboy from 'busboy';
import * as path from 'path';
import * as fs from 'fs';
import {handleError} from '../utils/errors';

@controller('/commands')
export class CommandsController implements interfaces.Controller {

    constructor( @inject(TYPES.CommandsService) private commandsService: CommandsService,
            @inject('tmpdir') private tmpDir: string) {}

    @httpPost('')
    public async createCommand(@requestBody() model: CommandModel, @response() res: Response) {
        logger.info(`commands.controller  createCommand: in: model: ${JSON.stringify(model)}`);
        try {
            const commandId = await this.commandsService.create(model);

            res.status(201).location(`/commands/${commandId}`);

        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:commandId')
    public async updateCommand(@requestBody() command:CommandModel, @response() res:Response, @requestParam('commandId') commandId:string) {

        logger.info(`commands.controller updateCommand: in: commandId: ${commandId}, command: ${JSON.stringify(command)}`);
        try {
            command.commandId = commandId;
            await this.commandsService.update(command);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('')
    public async listCommands(@response() res:Response): Promise<CommandListModel> {
        logger.info('commands.controller listCommands: in:');
        try {
            const model = await this.commandsService.list();
            logger.debug(`commands.controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpGet('/:commandId')
    public async getCommand(@requestParam('commandId') commandId:string, @response() res:Response): Promise<CommandModel> {

        logger.info(`commands.controller getCommand: in: commandId:${commandId}`);
        try {
            const model = await this.commandsService.get(commandId);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPut('/:commandId/files/:fileId')
    public async uploadCommandFile(@requestParam('commandId') commandId:string, @requestParam('fileId') fileId:string,
        @request() req: Request, @response() res: Response) {

        logger.info(`commands.controller uploadCommandFile: in: commandId:${commandId}, fileId:${fileId}`);

        const busboy = new Busboy.default({ headers: req.headers });
        const saveTo = path.join(this.tmpDir, `${commandId}_${fileId}`);
        let hasError: string;

        await new Promise((resolve, reject) => {
            busboy.on('file', async (_fieldName, stream, _filename, _encoding, _mimeType) => {
                stream.pipe(fs.createWriteStream(saveTo));
                stream.on('limit', () => {
                    hasError = 'filesSizeLimit';
                });
            });
            busboy.on('partsLimit', () => {
                hasError = 'partsLimit';
            });
            busboy.on('filesLimit', () => {
                hasError = 'filesNumberLimit';
            });
            busboy.on('fieldsLimit', () => {
                hasError = 'fieldsLimit';
            });
            busboy.on('finish', async () => {
                if (hasError) {
                    reject(hasError);
                } else {
                    await this.commandsService.uploadFile(commandId, fileId, saveTo);
                    res.status(204);
                    resolve();
                }
            });
            // Pipe things into busboy for processing
            req.pipe(busboy);
        });
    }

    @httpDelete('/:commandId/files/:fileId')
    public async deleteCommandFile(@requestParam('commandId') commandId:string, @requestParam('fileId') fileId:string,
        @response() res:Response) {

        logger.info(`commands.controller deleteCommandFile: in: commandId:${commandId}, fileId:${fileId}`);
        res.status(500).json({error: 'NOT_IMPLEMENTED'});

    }

    @httpGet('/:commandId/executions')
    public async listExecutions(@requestParam('commandId') commandId:string, @queryParam('status') status:string,
        @queryParam('maxResults') maxResults:number, @queryParam('nextToken') nextToken:string, @response() res:Response) {

        logger.info(`commands.controller listExecutions: in: commandId:${commandId}, status:${status}, maxResults:${maxResults}, nextToken:${nextToken}`);

        try {
            const params = {
                commandId,
                status: ExecutionStatus[status],
                maxResults,
                nextToken
            };
            const model = await this.commandsService.listExecutions(params);
            logger.debug(`commands.controller listExecutions: exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpGet('/:commandId/executions/:thingName')
    public async getExecution(@requestParam('commandId') commandId:string, @requestParam('thingName') thingName:string,
        @response() res:Response) {
        logger.info(`commands.controller getExecution: in: commandId:${commandId}, thingName:${thingName}`);

        try {
            const model = await this.commandsService.getExecution(commandId, thingName);
            logger.debug(`commands.controller getExecution: exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpDelete('/:commandId/executions/:thingName')
    public async cancelExecution(@requestParam('commandId') commandId:string, @requestParam('thingName') thingName:string,
        @response() res:Response) : Promise<void> {
        logger.info(`commands.controller cancelExecution: in: commandId:${commandId}, thingName:${thingName}`);

        try {
            await this.commandsService.cancelExecution(commandId, thingName);
            logger.debug(`commands.controller cancelExecution: exit:`);

            res.status(204);

        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

}
