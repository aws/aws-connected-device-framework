/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { inject } from 'inversify';
import { interfaces, controller, response, requestBody, requestParam, httpGet, httpPut } from 'inversify-express-utils';

import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

import { TYPES } from '../di/types';
import { DeploymentTemplatesService } from './template.service';
import { DeploymentTemplateModel, DeploymentTemplateRequest, DeploymentTemplatesList } from './template.model';

@controller('/deploymentTemplates')
export class DeploymentTemplateController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentTemplatesService) private deploymentTemplatesService: DeploymentTemplatesService) {}

    @httpPut('/:name')
    public async saveTemplate(
        @response() res: Response,
        @requestParam() params: any,
        @requestBody() req: DeploymentTemplateRequest,
    ): Promise<void> {

        logger.info(`DeploymentTemplate.controller saveTemplate: in: item:${JSON.stringify(req)}`);

        const template: DeploymentTemplateModel = req;
        template.name = params.name;

        try {
            await this.deploymentTemplatesService.save(template);
        } catch (err) {
            logger.error(`DeploymentTemplate.controller : err: ${err}`);
            handleError(err, res);
        }

        logger.debug(`DeploymentTemplate.controller saveTemplate: exit:`);
    }

    @httpGet('/:name')
    public async getTemplate(
        @response() res:Response,
        @requestParam() params: any
    ): Promise<DeploymentTemplateModel> {
        logger.info(`DeploymentTemplate.controller getTemplate: in: templateId:${params.name}`);

        let template:DeploymentTemplateModel;
        try {
            template = await this.deploymentTemplatesService.get(params.name);
        } catch (err) {
            logger.error(`DeploymentTemplate.controller : err: ${err}`);
            handleError(err, res);
        }
        logger.debug(`DeploymentTemplate.controller getTemplate: exit:`);
        return template;
    }

    @httpGet('')
    public async listTemplates(
        @response() res:Response,
        @requestParam() templateId: string
    ): Promise<DeploymentTemplatesList> {
        logger.info(`DeploymentTemplates.controller listTemplate: in: templateId:${templateId}`);

        let templates:DeploymentTemplatesList;
        try {
            templates = await this.deploymentTemplatesService.list();
        } catch (err) {
            logger.error(`DeploymentTemplate.controller : err: ${err}`);
            handleError(err, res);
        }
        logger.debug(`DeploymentTemplates.controller getTemplate: exit:`);

        return templates;

    }

}
