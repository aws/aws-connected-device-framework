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
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    httpPut,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { assembleSortKeys } from '../data/model';
import { TYPES } from '../di/types';
import {
    TypeDefinitionModel,
    TypeDefinitionStatus,
    TypeResource,
    TypeResourceList,
} from '../types/types.models';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TypeCategory } from './constants';
import { TypesService } from './types.service';

@controller('/templates')
export class TypesController implements interfaces.Controller {
    constructor(@inject(TYPES.TypesService) private typesService: TypesService) {}

    @httpGet('/:category/:templateId')
    public async getTemplate(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @queryParam('status') status: string,
        @response() res: Response
    ): Promise<TypeResource> {
        logger.info(
            `types.controller: getTemplate: in: category:${category}, templateId:${templateId}, status:${status}`
        );
        try {
            const model = await this.typesService.get(
                templateId,
                category,
                TypeDefinitionStatus[status]
            );
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model === undefined) {
                res.status(404).end();
            } else {
                const tr: TypeResource = {
                    templateId: model.templateId,
                    category: model.category,
                    properties: model.schema.definition.properties,
                    relations: model.schema.definition.relations,
                    required: model.schema.definition.required,
                    components: model.schema.definition.components,
                };

                res.status(200).json(tr).end();
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPost('/:category/:templateId')
    public async createTemplate(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestBody() definition: TypeDefinitionModel,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `types.controller: createTemplate: in: category:${category}, templateId:${templateId}, definition:${JSON.stringify(
                definition
            )}`
        );

        try {
            const result = await this.typesService.create(templateId, category, definition);
            if (!result.isValid) {
                res.status(400).json({ error: result.errors }).end();
            } else {
                res.status(201).end();
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPatch('/:category/:templateId')
    public async updateTemplate(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestBody() definition: TypeDefinitionModel,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `types.controller: updateTemplate: in: category:${category}, templateId:${templateId}, definition:${JSON.stringify(
                definition
            )}`
        );
        try {
            const result = await this.typesService.update(templateId, category, definition);
            if (!result.isValid) {
                res.status(404).json(result).end();
            } else {
                res.status(204).end();
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPut('/:category/:templateId/publish')
    public async publishTemplate(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `types.controller: publishTemplate: in: category:${category}, templateId:${templateId}`
        );
        try {
            await this.typesService.publish(templateId, category);
            res.status(204).json(null);
        } catch (e) {
            handleError(e, res);
        }

        logger.info('types.controller publishTemplate: exit:');
    }

    @httpDelete('/:category/:templateId')
    public async deleteTemplate(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @response() res: Response
    ): Promise<void> {
        logger.info(
            `types.controller deleteTemplate: in: category:${category}, templateId:${templateId}`
        );
        try {
            await this.typesService.delete(templateId, category);
            res.status(204).end();
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:category')
    public async listTemplates(
        @requestParam('category') category: TypeCategory,
        @queryParam('status') status: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string | string[],
        @response() res: Response
    ): Promise<TypeResourceList> {
        logger.info(
            `types.controller: listTemplates: in: category:${category}, status:${status}, offset:${offset}, count:${count}, sort:${sort}`
        );

        const r: TypeResourceList = { results: [] };
        if (offset && count) {
            r.pagination = {
                offset,
                count,
            };
        }
        try {
            const sortKeys = assembleSortKeys(sort);
            const results = await this.typesService.list(
                category,
                TypeDefinitionStatus[status],
                offset,
                count,
                sortKeys
            );

            if (results === undefined) {
                res.status(404).end();
            } else {
                results.forEach((m) => {
                    const tr: TypeResource = {
                        templateId: m.templateId,
                        category: m.category,
                        properties: m.schema.definition.properties,
                        relations: m.schema.definition.relations,
                        required: m.schema.definition.required,
                    };
                    r.results.push(tr);
                });
                res.status(200).json(r).end();
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }
}
