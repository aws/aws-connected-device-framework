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
import {Response} from 'express';
import {inject} from 'inversify';
import {
    controller, httpDelete, httpGet, httpPost, httpPut, interfaces, queryParam, requestBody,
    requestParam, response
} from 'inversify-express-utils';

import {TYPES} from '../di/types';
import {handleError} from '../utils/errors.util';
import {logger} from '../utils/logger.util';
import {TemplatesAssembler} from './templates.assembler';
import {EditableTemplateResource} from './templates.models';
import {TemplatesService} from './templates.service';

@controller('/templates')
export class TemplatesController implements interfaces.Controller {

    constructor(
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.TemplatesAssembler) private templatesAssembler: TemplatesAssembler) {

    }

    @httpPost('')
    public async createTemplate(@requestBody() resource: EditableTemplateResource, @response() res: Response): Promise<void> {
        logger.info(`templates.controller createTemplate: in: resource: ${JSON.stringify(resource)}`);
        try {
            const item = this.templatesAssembler.toItem(resource);
            await this.templatesService.create(item);
            res.location(`/templates/${item.name}`)
                .header('x-name', item.name)
                .header('x-version', String(item.version))
                .status(201)
                .send();
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`templates.controller createTemplate: exit:`);
    }

    @httpPut('/:name')
    public async updateTemplate(@requestParam('name') name: string, @requestBody() resource: EditableTemplateResource, @response() res: Response): Promise<void> {
        logger.info(`templates.controller updateTemplate: in: resource: ${JSON.stringify(resource)}`);
        try {
            resource.name = name;
            const item = this.templatesAssembler.toItem(resource);
            await this.templatesService.update(item);
            res.location(`/templates/${item.name}`)
                .header('x-name', item.name)
                .header('x-version', String(item.version))
                .status(204)
                .send();
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`templates.controller updateTemplate: exit:`);
    }

    @httpGet('/:name')
    public async getLatestTemplate(@requestParam('name') name: string, @response() res: Response): Promise<void> {

        logger.debug(`templates.controller getLatestTemplate: name:${name}`);

        try {
            const item = await this.templatesService.get(name);
            if (item === undefined) {
                logger.debug(`templates.controller getLatestTemplate: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.templatesAssembler.toResource(item);
                logger.debug(`templates.controller getLatestTemplate: exit: ${JSON.stringify(resource)}`);
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:name')
    public async deleteTemplate(@requestParam('name') name: string, @response() res: Response): Promise<void> {

        logger.debug(`templates.controller deleteTemplate: name:${name}`);

        try {
            await this.templatesService.delete(name);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`templates.controller deleteTemplate: exit:`);
    }

    @httpGet('')
    public async listTemplates(@queryParam('count') count: number, @queryParam('exclusiveStartName') exclusiveStartName: string,
                               @response() res: Response): Promise<void> {

        logger.debug(`templates.controller listTemplates: in: count:${count}, exclusiveStartName:${exclusiveStartName}`);

        try {

            const [items, paginationKey] = await this.templatesService.list(count, {name: exclusiveStartName});
            const resources = this.templatesAssembler.toListResource(items, count, paginationKey);
            logger.debug(`templates.controller listTemplates: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:name/versions')
    public async listTemplateVersions(@requestParam('name') name: string, @queryParam('count') count: number, @queryParam('exclusiveStartVersion') exclusiveStartVersion: number, @response() res: Response): Promise<void> {

        logger.debug(`templates.controller listTemplateVersions: name:${name}, count:${count}, exclusiveStartVersion:${exclusiveStartVersion}`);

        try {
            const [items, paginationKey] = await this.templatesService.listVersions(name, count, {version: exclusiveStartVersion});
            const resources = this.templatesAssembler.toVersionListResource(items, count, paginationKey);
            logger.debug(`templates.controller listTemplateVersions: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:name/versions/:version')
    public async getTemplateVersion(@requestParam('name') name: string, @requestParam('version') version: number, @response() res: Response): Promise<void> {

        logger.debug(`templates.controller getTemplateVersion: name:${name}, version:${version}`);

        try {
            const item = await this.templatesService.get(name, version);
            if (item === undefined) {
                logger.debug(`templates.controller getTemplateVersion: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.templatesAssembler.toResource(item);
                logger.debug(`templates.controller getTemplateVersion: exit: ${JSON.stringify(resource)}`);
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

}
