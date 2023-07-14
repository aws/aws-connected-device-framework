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

import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';

import { RequestHeaders } from './commands.model';
import { TemplateModel } from './templates.models';
import { TemplatesService, TemplatesServiceBase } from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.COMMANDS_BASE_URL;
    }

    async createTemplate(
        template: TemplateModel,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);

        await request
            .post(`${this.baseUrl}${super.templatesRelativeUrl()}`)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));
    }

    async getTemplate(
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<TemplateModel> {
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(templateId)}`;
        const res = await request.get(url).set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listTemplates(additionalHeaders?: RequestHeaders): Promise<TemplateModel> {
        const res = await request
            .get(`${this.baseUrl}${super.templatesRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateTemplate(
        template: TemplateModel,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(template.templateId)}`;

        const res = await request
            .patch(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(templateId)}`;

        await request.delete(url).set(this.buildHeaders(additionalHeaders));
    }
}
