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
    interfaces,
    controller,
    response,
    requestBody,
    requestParam,
    httpGet,
    httpPut,
    httpDelete,
    queryParam
} from 'inversify-express-utils';

import { handleError } from '../utils/errors';
import { logger } from '../utils/logger.util';

import { TYPES } from '../di/types';
import { DeploymentTemplatesService } from './template.service';
import { DeploymentTemplateAssembler } from './template.assembler';

import { DeploymentTemplateItem, DeploymentTemplateResource,} from './template.model';

@controller('/deploymentTemplates')
export class DeploymentTemplateController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentTemplatesService) private deploymentTemplatesService: DeploymentTemplatesService,
        @inject(TYPES.DeploymentTemplateAssembler) private deploymentTemplateAssembler: DeploymentTemplateAssembler
    ) {}

    @httpPut('/:name')
    public async saveTemplate(
        @response() res: Response,
        @requestParam('name') name: string,
        @requestBody() req: DeploymentTemplateResource,
    ): Promise<void> {

        logger.info(`DeploymentTemplate.controller saveTemplate: in: item:${JSON.stringify(req)}`);

        const template: DeploymentTemplateResource = req;
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
    ): Promise<DeploymentTemplateItem> {
        logger.info(`DeploymentTemplate.controller getTemplate: in: templateId:${name}`);

        let template:DeploymentTemplateItem;
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
        @queryParam('count') count: number,
        @queryParam('exclusiveStartName') exclusiveStartName: string,
        @response() res:Response,
    ): Promise<void> {
        logger.info(`DeploymentTemplates.controller listTemplate: in: count:${count}, exclusiveStartName:${exclusiveStartName}`);

        try {
            const [items, paginationKey] = await this.deploymentTemplatesService.list(count, {name: exclusiveStartName});
            const resources = this.deploymentTemplateAssembler.toListResource(items, count, paginationKey);
            logger.debug(`DeploymentTemplates.controller listTemplates: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);

        } catch (err) {
            logger.error(`DeploymentTemplate.controller : err: ${err}`);
            handleError(err, res);
        }
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
