/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, httpGet, httpPost, httpPut, response, requestBody, requestParam, queryParam, httpDelete, httpPatch } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TypesService } from './types.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {TypeDefinitionModel,TypeResource, TypeResourceList, TypeDefinitionStatus} from '../types/types.models';
import {handleError} from '../utils/errors';
import { TypeCategory } from './constants';

@controller('/templates')
export class TypesController implements interfaces.Controller {

    constructor( @inject(TYPES.TypesService) private typesService: TypesService) {}

    @httpGet('/:category/:templateId')
    public async getTemplate(@requestParam('category') category: TypeCategory, @requestParam('templateId') templateId: string,
        @queryParam('status') status: string, @response() res: Response): Promise<TypeResource> {

        logger.info(`types.controller: getTemplate: in: category:${category}, templateId:${templateId}, status:${status}`);
        try {
            const model = await this.typesService.get(templateId, category, TypeDefinitionStatus[status]);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404).end();
            } else {

                const tr = new TypeResource();
                tr.templateId = model.templateId;
                tr.category = model.category;
                tr.properties = model.schema.definition.properties;
                tr.relations = model.schema.definition.relations;
                tr.required = model.schema.definition.required;
                tr.components = model.schema.definition.components;

                res.status(200).json(tr).end();
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPost('/:category/:templateId')
    public async createTemplate(@requestParam('category') category: TypeCategory, @requestParam('templateId') templateId: string,
          @requestBody() definition: TypeDefinitionModel, @response() res: Response) : Promise<void> {
        logger.info(`types.controller: createTemplate: in: category:${category}, templateId:${templateId}, definition:${JSON.stringify(definition)}`);

        try {
            const result = await this.typesService.create(templateId, category, definition);
            if (!result.isValid) {
                res.status(400).json({error: result.errors}).end();
            } else {
                res.status(201).end();
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPatch('/:category/:templateId')
    public async updateTemplate(@requestParam('category') category: TypeCategory, @requestParam('templateId') templateId: string,
          @requestBody() definition: TypeDefinitionModel, @response() res: Response) {
        logger.info(`types.controller: updateTemplate: in: category:${category}, templateId:${templateId}, definition:${JSON.stringify(definition)}`);
        try {
            const result = await this.typesService.update(templateId, category, definition);
            if (!result.isValid) {
                res.status(404).json(result).end();
            } else {
                res.status(204).end();
            }
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPut('/:category/:templateId/publish')
    public async publishTemplate(@requestParam('category') category: TypeCategory, @requestParam('templateId') templateId: string,
        @response() res: Response) : Promise<void>  {

        logger.info(`types.controller: publishTemplate: in: category:${category}, templateId:${templateId}`);
        try {
            await this.typesService.publish(templateId, category);
            res.status(204).json(null);
        } catch (e) {
            handleError(e,res);
        }

        logger.info('types.controller publishTemplate: exit:');
    }

    @httpDelete('/:category/:templateId')
    public async deleteTemplate(@requestParam('category') category: TypeCategory, @requestParam('templateId') templateId: string, @response() res: Response)  {

        logger.info(`types.controller deleteTemplate: in: category:${category}, templateId:${templateId}`);
        try {
            await this.typesService.delete(templateId, category);
            res.status(204).end();
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:category')
    public async listTemplates(@requestParam('category') category: TypeCategory, @queryParam('status') status: string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @response() res: Response): Promise<TypeResourceList> {

        logger.info(`types.controller: listTemplates: in: category:${category}, status:${status}, offset:${offset}, count:${count}`);

        const r: TypeResourceList= {results:[]};
        if (offset && count) {
            r.pagination = {
                offset,
                count
            };
        }
        try {
            const results = await this.typesService.list(category, TypeDefinitionStatus[status], offset, count);

            if (results===undefined) {
                res.status(404).end();
            } else {
                results.forEach(m=> {
                    const tr = new TypeResource();
                    tr.templateId = m.templateId;
                    tr.category = m.category;
                    tr.properties = m.schema.definition.properties;
                    tr.relations = m.schema.definition.relations;
                    tr.required = m.schema.definition.required;
                    r.results.push(tr);
                });
                res.status(200).json(r).end();
            }

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }
}
