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
import {
    interfaces,
    controller,
    response,
    httpPost,
    requestBody,
    httpGet,
    requestParam,
    httpPatch,
    httpDelete,
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { TemplatesService } from './templates.service';
import { TemplateModel, TemplateListModel } from './templates.models';
import { PathHelper } from '../utils/path.helper';
import { handleError } from '../utils/errors';

@controller('/templates')
export class TemplatesController implements interfaces.Controller {
    constructor(@inject(TYPES.TemplatesService) private templatesService: TemplatesService) {}

    @httpPost('')
    public async createTemplate(
        @requestBody() template: TemplateModel,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `templates.controller  createTemplate: in: template: ${JSON.stringify(template)}`,
        );
        try {
            await this.templatesService.create(template);
            const location = PathHelper.encodeUrl('templates', template.templateId);
            res.status(201).location(location).setHeader('x-templateId', template.templateId);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:templateId')
    public async getTemplate(
        @requestParam('templateId') templateId: string,
        @response() res: Response,
    ): Promise<TemplateModel> {
        logger.info(`templates.controller getTemplate: in: templateId:${templateId}`);
        try {
            const model = await this.templatesService.get(templateId);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model === undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('')
    public async listTemplates(@response() res: Response): Promise<TemplateListModel> {
        logger.info('templates.controller listTemplates: in:');
        try {
            const model = await this.templatesService.list();
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model === undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPatch('/:templateId')
    public async updateTemplate(
        @requestBody() template: TemplateModel,
        @response() res: Response,
        @requestParam('templateId') templateId: string,
    ): Promise<void> {
        logger.info(
            `templates.controller updateTemplate: in: templateId: ${templateId}, template: ${JSON.stringify(
                template,
            )}`,
        );
        try {
            template.templateId = templateId;
            await this.templatesService.update(template);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:templateId')
    public async deleteTemplate(
        @response() res: Response,
        @requestParam('templateId') templateId: string,
    ): Promise<void> {
        logger.info(`templates.controller deleteTemplate: in: templateId: ${templateId}`);
        try {
            await this.templatesService.delete(templateId);
        } catch (e) {
            handleError(e, res);
        }
    }
}
