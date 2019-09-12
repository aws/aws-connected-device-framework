/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, httpPost, requestBody, httpGet, requestParam, httpPatch, httpDelete} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import { TemplatesService } from './templates.service';
import { TemplateModel, TemplateListModel } from './templates.models';
import { PathHelper } from '../utils/path.helper';
import {handleError} from '../utils/errors';

@controller('/templates')
export class TemplatesController implements interfaces.Controller {

    constructor( @inject(TYPES.TemplatesService) private templatesService: TemplatesService) {}

    @httpPost('')
    public async createTemplate(@requestBody() template: TemplateModel, @response() res: Response) {
        logger.info(`templates.controller  createTemplate: in: template: ${JSON.stringify(template)}`);
        try {
            await this.templatesService.create(template);
            const location = PathHelper.encodeUrl('templates', template.templateId);
            res.status(201).location(location);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:templateId')
    public async getTemplate(@requestParam('templateId') templateId:string, @response() res:Response): Promise<TemplateModel> {

        logger.info(`templates.controller getTemplate: in: templateId:${templateId}`);
        try {
            const model = await this.templatesService.get(templateId);
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

    @httpGet('')
    public async listTemplates(@response() res:Response): Promise<TemplateListModel> {

        logger.info('templates.controller listTemplates: in:');
        try {
            const model = await this.templatesService.list();
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

    @httpPatch('/:templateId')
    public async updateTemplate(@requestBody() template:TemplateModel, @response() res:Response, @requestParam('templateId') templateId:string) {

        logger.info(`templates.controller updateTemplate: in: templateId: ${templateId}, template: ${JSON.stringify(template)}`);
        try {
            template.templateId = templateId;
            await this.templatesService.update(template);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:templateId')
    public async deleteTemplate(@response() res:Response, @requestParam('templateId') templateId:string) : Promise<void> {

        logger.info(`templates.controller deleteTemplate: in: templateId: ${templateId}`);
        try {
            await this.templatesService.delete(templateId);
        } catch (e) {
            handleError(e,res);
        }

    }

}
