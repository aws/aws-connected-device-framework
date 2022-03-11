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
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import ow from 'ow';
import * as request from 'superagent';

import {RequestHeaders} from './common.model';
import {NewTemplate, Template} from './templates.model';
import {TemplatesService, TemplatesServiceBase} from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {

    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASSPROVISIONING_BASE_URL;
    }

    async createTemplate(template: NewTemplate, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const url = `${this.baseUrl}${super.templatesRelativeUrl()}`;

        await request.post(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));
    }

    async updateTemplate(template: NewTemplate, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const url = `${this.baseUrl}${super.templateRelativeUrl(template.name)}`;

        await request.put(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));

    }

    async getLatestTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<Template> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

    async deleteTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));

    }

}
