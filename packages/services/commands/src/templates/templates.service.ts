/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { TemplateModel, TemplateListModel } from './templates.models';
import { TemplatesDao } from './templates.dao';
import ow from 'ow';

@injectable()
export class TemplatesService {

    constructor( @inject(TYPES.TemplatesDao) private templatesDao: TemplatesDao ) {}

    public async create(model: TemplateModel) : Promise<void> {
        logger.debug(`templates.service create: in: model: ${JSON.stringify(model)}`);

        // validation
        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.operation, ow.string.nonEmpty);
        ow(model.document, ow.string.nonEmpty);

        // Save to datastore
        await this.templatesDao.create(model);

        logger.debug('templates.service create: exit:');
    }

    public async update(model: TemplateModel) : Promise<void> {
        logger.debug(`templates.service update: in: model: ${JSON.stringify(model)}`);

        // validation
        ow(model, ow.object.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        if (model.operation!==undefined) {
            ow(model.operation, ow.string.nonEmpty);
        }
        if (model.document!==undefined) {
            ow(model.document, ow.string.nonEmpty);
        }

        // Save to datastore
        await this.templatesDao.update(model);

        logger.debug('templates.service update: exit:');
    }

    public async get(templateId:string): Promise<TemplateModel> {
        logger.debug(`templates.service get: in: templateId:${templateId}`);

        // validation
        ow(templateId, ow.string.nonEmpty);

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

    public async delete(templateId:string) : Promise<void> {
        logger.debug(`templates.service delete: in: templateId: ${templateId}`);

        // validation
        ow(templateId, ow.string.nonEmpty);

        // Save to datastore
        await this.templatesDao.delete(templateId);

        logger.debug('templates.service delete: exit:');
    }
}
