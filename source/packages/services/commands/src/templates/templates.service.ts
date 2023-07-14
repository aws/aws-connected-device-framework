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
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { TemplatesDao } from './templates.dao';
import { TemplateListModel, TemplateModel } from './templates.models';
import { TemplatesValidator } from './templates.validator';

@injectable()
export class TemplatesService {
    constructor(
        @inject(TYPES.TemplatesValidator) private validator: TemplatesValidator,
        @inject(TYPES.TemplatesDao) private templatesDao: TemplatesDao
    ) {}

    public async create(model: TemplateModel): Promise<void> {
        logger.debug(`templates.service create: in: model: ${JSON.stringify(model)}`);

        // validation
        this.validator.validate(model);

        // Save to datastore
        await this.templatesDao.create(model);

        logger.debug('templates.service create: exit:');
    }

    public async update(model: TemplateModel): Promise<void> {
        logger.debug(`templates.service update: in: model: ${JSON.stringify(model)}`);

        // validation
        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        if (model.operation !== undefined) {
            ow(model.operation, ow.string.nonEmpty);
        }
        if (model.document !== undefined) {
            ow(model.document, ow.string.nonEmpty);
        }

        // Save to datastore
        await this.templatesDao.update(model);

        logger.debug('templates.service update: exit:');
    }

    public async get(templateId: string): Promise<TemplateModel> {
        logger.debug(`templates.service get: in: templateId:${templateId}`);

        // validation
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const template = await this.templatesDao.get(templateId);

        logger.debug(`templates.service get: exit: template:${JSON.stringify(template)}`);
        return template;
    }

    public async list(): Promise<TemplateListModel> {
        logger.debug('templates.service list: in:');

        const templates = await this.templatesDao.list();

        logger.debug(`templates.service get: exit: template:${JSON.stringify(templates)}`);
        return templates;
    }

    public async delete(templateId: string): Promise<void> {
        logger.debug(`templates.service delete: in: templateId: ${templateId}`);

        // validation
        ow(templateId, 'templateId', ow.string.nonEmpty);

        // Save to datastore
        await this.templatesDao.delete(templateId);

        logger.debug('templates.service delete: exit:');
    }
}
