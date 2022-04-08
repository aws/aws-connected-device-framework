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
    httpPut,
    httpDelete,
    queryParam
} from 'inversify-express-utils';
import { Request } from 'express';

import { handleError } from '../utils/errors';
import { logger } from '../utils/logger.util';

import { TYPES } from '../di/types';
import { DeploymentTemplatesService } from './template.service';
import { DeploymentTemplateAssembler } from './template.assembler';

import { DeploymentTemplateItem } from './template.model';

const storage = multer.memoryStorage();
const upload = multer({storage});

@controller('/deploymentTemplates')
export class DeploymentTemplateController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentTemplatesService) private deploymentTemplatesService: DeploymentTemplatesService,
        @inject(TYPES.DeploymentTemplateAssembler) private deploymentTemplateAssembler: DeploymentTemplateAssembler,
    ) {}

    @httpPut('/:name', upload.single('playbookFile'))
    public async saveTemplate(
        @response() res: Response,
        @requestParam('name') name: string,
        @request() req: Request,
    ): Promise<void> {
        logger.info(`DeploymentTemplate.controller saveTemplate: in: item:`);

        try {
            ow(req.file, ow.object.hasKeys('buffer'));
            ow(req.body.playbookName, ow.string.nonEmpty);
            ow(req.body.deploymentType, ow.string.nonEmpty);

            const template: DeploymentTemplateItem = req.body;
            template.name = name;
            template.playbookFile = req.file.buffer;

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
