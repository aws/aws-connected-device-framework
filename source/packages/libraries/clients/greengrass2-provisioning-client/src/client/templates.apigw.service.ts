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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { RequestHeaders } from './common.model';
import { NewTemplate, Template } from './templates.model';
import { TemplatesService, TemplatesServiceBase } from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASS2PROVISIONING_BASE_URL;
    }

    async createTemplate(
        template: NewTemplate,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const url = `${this.baseUrl}${super.templatesRelativeUrl()}`;

        return await request
            .post(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateTemplate(
        template: NewTemplate,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const url = `${this.baseUrl}${super.templateRelativeUrl(template.name)}`;

        return await request
            .put(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getLatestTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<Template> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}

