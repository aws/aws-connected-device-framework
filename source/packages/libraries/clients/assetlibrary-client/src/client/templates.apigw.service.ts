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
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { CategoryEnum, StatusEnum, TypeResource, TypeResourceList } from './templates.model';
import { TemplatesService, TemplatesServiceBase } from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    async getTemplate(
        category: CategoryEnum,
        templateId: string,
        status: StatusEnum,
        additionalHeaders?: RequestHeaders
    ): Promise<TypeResource> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        const queryString = QSHelper.getQueryString({ status });
        url += `?${queryString}`;

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

    async createTemplate(
        resource: TypeResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(resource, 'resource', ow.object.nonEmpty);
        ow(resource.templateId, 'templateId', ow.string.nonEmpty);
        ow(resource.category, 'category', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(
            resource.category,
            resource.templateId
        )}`;

        const body = Object.assign({}, resource);
        delete body.templateId;
        delete body.category;

        return await request
            .post(url)
            .send(body)
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
        resource: TypeResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(resource, 'resource', ow.object.nonEmpty);
        ow(resource.templateId, 'templateId', ow.string.nonEmpty);
        ow(resource.category, 'category', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(
            resource.category,
            resource.templateId
        )}`;

        const body = Object.assign({}, resource);
        delete body.templateId;
        delete body.category;

        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async publishTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.publishTemplateRelativeUrl(category, templateId)}`;

        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
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

    async listTemplates(
        category: CategoryEnum,
        status?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<TypeResourceList> {
        ow(category, 'category', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.templatesRelativeUrl(category)}`;
        const queryString = QSHelper.getQueryString({ status, offset, count });
        if (queryString) {
            url += `?${queryString}`;
        }

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
}
