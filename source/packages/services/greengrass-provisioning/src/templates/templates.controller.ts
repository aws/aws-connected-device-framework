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
import { interfaces, controller, response, requestBody, requestParam, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { TemplatesAssembler } from './templates.assembler';
import { TemplateResource, TemplateResourceList } from './templates.models';
import { TemplatesService } from './templates.service';

@controller('/templates')
export class TemplatesController implements interfaces.Controller {

    constructor( @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.TemplatesAssembler) private templatesAssembler: TemplatesAssembler) {}

    @httpPut('/:name')
    public async saveTemplate(@requestBody() template:TemplateResource, @requestParam('name') name:string,
    @response() res:Response) : Promise<TemplateResource> {
        logger.info(`templates.controller saveTemplate: in: name:${name},  template:${JSON.stringify(template)}`);

        let savedResource: TemplateResource;

        template.name = name;
        try {
            let item = this.templatesAssembler.fromResource(template);
            item = await this.templatesService.save(item);
            savedResource = this.templatesAssembler.toResource(item);
        } catch (e) {
            handleError(e,res);
        }

        logger.info(`templates.controller saveTemplate: savedResource:${JSON.stringify(savedResource)}`);
        return savedResource;
    }

    @httpGet('/:name')
    public async getTemplate(@requestParam('name') name:string, @response() res:Response) : Promise<TemplateResource> {
        logger.info(`templates.controller getTemplate: in: name:${name}`);

        try {
            const item = await this.templatesService.get(name);
            const template = this.templatesAssembler.toResource(item);
            logger.info(`templates.controller getTemplate: exit: template:${JSON.stringify(template)}`);
            return template;
        } catch (e) {
            handleError(e,res);
        }
        return undefined;
    }

    @httpDelete('/:name')
    public async deleteTemplate(@requestParam('name') name:string, @response() res:Response) : Promise<void> {
        logger.info(`templates.controller deleteTemplate: in: name:${name}`);

        try {
            await this.templatesService.delete(name);
        } catch (e) {
            handleError(e,res);
        }
        logger.info(`templates.controller deleteTemplate: exit: `);
    }

    @httpGet('')
    public async listTemplates(@response() res:Response) : Promise<TemplateResourceList> {
        logger.info(`templates.controller listTemplates: in:`);

        let templates:TemplateResourceList;
        try {
            const items = await this.templatesService.list();
            templates = this.templatesAssembler.toResourceList(items);
        } catch (e) {
            handleError(e,res);
        }
        logger.info(`templates.controller listTemplates: exit: templates:${JSON.stringify(templates)}`);
        return templates;
    }

}
