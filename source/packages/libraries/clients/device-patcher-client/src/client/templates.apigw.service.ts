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

import {injectable} from 'inversify';
import ow from 'ow';
import * as request from 'superagent';

import {RequestHeaders} from './common.model';
import {
    CreatePatchTemplateParams,
    PatchTemplate,
    PatchTemplateList,
    UpdatePatchTemplateParams
} from './templates.model';
import {TemplatesService, TemplatesServiceBase} from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.DEVICE_PATCHER_BASE_URL;
    }

    async createTemplate(template: CreatePatchTemplateParams, additionalHeaders?:RequestHeaders) : Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.playbookFileLocation, ow.string.nonEmpty);
        ow(template.patchType, ow.string.nonEmpty);

        if (template.extraVars) {
            const keys = Object.keys(template.extraVars);
            for (const key of keys) {
                template[`extraVars[${key}]`] = template.extraVars[key];
            }
            delete template.extraVars;
        }

        const url = `${this.baseUrl}${super.templatesRelativeUrl()}`;

        const res = await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .field(template)
            .attach('playbookFile', template.playbookFileLocation)

        return res.body;
    }

    async updateTemplate(template: UpdatePatchTemplateParams, additionalHeaders: RequestHeaders): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);

        if (template.extraVars) {
            const keys = Object.keys(template.extraVars);
            for (const key of keys) {
                template[`extraVars[${key}]`] = template.extraVars[key];
            }
            delete template.extraVars;
        }

        const url = `${this.baseUrl}${super.templateRelativeUrl(template.name)}`;

        const res = await request.patch(url)
            .set(this.buildHeaders(additionalHeaders))
            .field(template)
            .attach('playbookFile', template.playbookFileLocation)

        return res.body;
    }

    async getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<PatchTemplate> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;
    }

    async listTemplates(additionalHeaders?:RequestHeaders) : Promise<PatchTemplateList> {

        const url = `${this.baseUrl}${super.templatesRelativeUrl()}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;
    }

    async deleteTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }
}
