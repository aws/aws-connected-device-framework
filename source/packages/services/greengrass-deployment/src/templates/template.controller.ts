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
import { interfaces, controller, response, requestBody, requestParam, httpGet, httpPut, httpDelete } from 'inversify-express-utils';

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
        @requestParam('name') name: string,
        @requestBody() req: DeploymentTemplateRequest,
    ): Promise<void> {

        logger.info(`DeploymentTemplate.controller saveTemplate: in: item:${JSON.stringify(req)}`);

        const template: DeploymentTemplateModel = req;
        template.name = name;

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
        @requestParam('name') name: string
    ): Promise<DeploymentTemplateModel> {
        logger.info(`DeploymentTemplate.controller getTemplate: in: templateId:${name}`);

        let template:DeploymentTemplateModel;
        try {
            template = await this.deploymentTemplatesService.get(name);
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

    @httpDelete('/:name')
    public async deleteTemplate(@requestParam('name') name:string, @response() res:Response) : Promise<void> {
        logger.info(`templates.controller deleteTemplate: in: name:${name}`);

        try {
            await this.deploymentTemplatesService.delete(name);
        } catch (e) {
            handleError(e,res);
        }
        logger.info(`templates.controller deleteTemplate: exit: `);
    }


}
