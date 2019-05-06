/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { logger } from '../utils/logger.util';
import { TYPES } from '../di/types';
import * as dot from 'dot';
import { MessageCompilerDao } from './messageCompiler.dao';

@injectable()
export class MessageCompilerService {

    private _templateMap: {[eventId:string]: {[target:string]: dot.RenderFunction}}= {};

    public constructor(
        @inject(TYPES.MessageCompilerDao) private messageCompilerDao:MessageCompilerDao) {
    }

    public async compile(eventId:string, targetType:string, attributes:{[key:string]:string|number}): Promise<string> {
        logger.debug(`messageCompiler.service compile: in: eventId:${eventId}, targetType:${targetType}, attributes:${JSON.stringify(attributes)}`);

        // do we already have the requested template compiled and cached?
        let eventTemplateFns = this._templateMap[eventId];

        // if not, retrieve it from the db then compile and cache it
        if (eventTemplateFns===undefined) {

            const messageTemplates = await this.messageCompilerDao.listTemplates(eventId);

            eventTemplateFns= {};

            Object.keys(messageTemplates.supportedTargets).forEach(k=> {
                eventTemplateFns[k] = dot.template(messageTemplates.templates[messageTemplates.supportedTargets[k]]);
            });

            this._templateMap[eventId]=eventTemplateFns;
        }

        // compile and return the message
        let templateFn = eventTemplateFns[targetType];
        if (templateFn===undefined) {
            templateFn = eventTemplateFns['default'];
        }

        const message =  templateFn(attributes);
        logger.debug(`messageCompiler.service compile: exit:${message}`);
        return message;
    }
}
