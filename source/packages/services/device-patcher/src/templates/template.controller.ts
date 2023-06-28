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
import ow from 'ow';
import multer from "multer";

import {
    interfaces,
    controller,
    response,
    request,
    requestParam,
    httpGet,
    httpPatch,
    httpPost,
    httpDelete,
    queryParam
} from 'inversify-express-utils';
import { Request } from 'express';

import { handleError } from '../utils/errors';
import { logger } from '@awssolutions/simple-cdf-logger';

import { TYPES } from '../di/types';
import { PatchTemplatesService } from './template.service';
import { PatchTemplateAssembler } from './template.assembler';

import { PatchTemplateItem } from './template.model';

const storage = multer.memoryStorage();
const upload = multer({storage});

@controller('/patchTemplates')
export class PatchTemplateController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.PatchTemplatesService) private patchTemplatesService: PatchTemplatesService,
        @inject(TYPES.PatchTemplateAssembler) private patchTemplateAssembler: PatchTemplateAssembler,
    ) {}

    @httpPost('', upload.single('playbookFile'))
    public async createTemplate(
        @response() res: Response,
        @request() req: Request,
    ): Promise<void> {
        logger.info(`PatchTemplate.controller createTemplate: in: item:`);

        try {
            ow(req, ow.object.nonEmpty);
            ow(req.file, ow.object.hasKeys('buffer'));
            ow(req.body, ow.object.nonEmpty);

            const template: PatchTemplateItem = req.body;

            ow(template.name, ow.string.nonEmpty);
            ow(template.patchType, ow.string.nonEmpty);
            //ow(template.playbookFileContents, ow.string.nonEmpty);

            template.playbookName = template.playbookName ?? template.name;
            template.playbookFile = req.file.buffer;
            template.playbookName = req.file.originalname;

            if(template.extraVars) {
                if(typeof template.extraVars === 'string') {
                    throw new Error("BAD_REQUEST")
                }
            }
            await this.patchTemplatesService.create(template);
        } catch (err) {
            logger.error(`PatchTemplate.controller : err: ${err}`);
            handleError(err, res);
        }

        logger.debug(`PatchTemplate.controller createTemplate: exit:`);
    }

    @httpPatch('/:name', upload.single('playbookFile'))
    public async updateTemplate(
        @response() res: Response,
        @requestParam('name') name: string,
        @request() req: Request,
    ): Promise<void> {
        logger.info(`PatchTemplate.controller updateTemplate: in: item:`);

        try {
            ow(req, ow.object.nonEmpty);
            ow(req.body, ow.object.nonEmpty);
            ow(name, ow.string.nonEmpty);

            const template: PatchTemplateItem = req.body;
            template.name = name;

            if (req.file) {
                template.playbookFile = req.file.buffer;
                template.playbookName = req.file.originalname;
            }

            if(template.extraVars) {
                if(typeof template.extraVars === 'string') {
                    throw new Error("BAD_REQUEST")
                }
            }

            await this.patchTemplatesService.update(template);
        } catch (err) {
            logger.error(`PatchTemplate.controller : err: ${err}`);
            handleError(err, res);
        }

        logger.debug(`PatchTemplate.controller updateTemplate: exit:`);
    }

    @httpGet('/:name')
    public async getTemplate(
        @response() res:Response,
        @requestParam('name') name: string
    ): Promise<PatchTemplateItem> {
        logger.info(`PatchTemplate.controller getTemplate: in: templateId:${name}`);

        let template:PatchTemplateItem;
        try {
            template = await this.patchTemplatesService.get(name);
        } catch (err) {
            logger.error(`PatchTemplate.controller : err: ${err}`);
            handleError(err, res);
        }
        logger.debug(`PatchTemplate.controller getTemplate: exit:`);
        return template;
    }

    @httpGet('')
    public async listTemplates(
        @queryParam('count') count: number,
        @queryParam('exclusiveStartName') exclusiveStartName: string,
        @response() res:Response,
    ): Promise<void> {
        logger.info(`PatchTemplates.controller listTemplate: in: count:${count}, exclusiveStartName:${exclusiveStartName}`);

        try {
            const [items, paginationKey] = await this.patchTemplatesService.list(count, {name: exclusiveStartName});
            const resources = this.patchTemplateAssembler.toListResource(items, count, paginationKey);
            logger.debug(`PatchTemplates.controller listTemplates: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);

        } catch (err) {
            logger.error(`PatchTemplate.controller : err: ${err}`);
            handleError(err, res);
        }
    }

    @httpDelete('/:name')
    public async deleteTemplate(@requestParam('name') name:string, @response() res:Response) : Promise<void> {
        logger.info(`templates.controller deleteTemplate: in: name:${name}`);

        try {
            await this.patchTemplatesService.delete(name);
        } catch (e) {
            handleError(e,res);
        }
        logger.info(`templates.controller deleteTemplate: exit: `);
    }


}
