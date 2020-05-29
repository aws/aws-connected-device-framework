/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import config from 'config';
import {TemplateModel} from './templates.models';
import {RequestHeaders} from './commands.model';
import {TemplatesService, TemplatesServiceBase} from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('commands.baseUrl') as string;
    }

    async createTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(template, ow.object.nonEmpty);

        await request.post(`${this.baseUrl}${super.templatesRelativeUrl()}`)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));
    }

    async getTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<TemplateModel> {
        ow(templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(templateId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listTemplates(additionalHeaders?: RequestHeaders): Promise<TemplateModel> {

        const res = await request.get(`${this.baseUrl}${super.templatesRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(template.templateId)}`;

        const res = await request.patch(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(templateId)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

}
