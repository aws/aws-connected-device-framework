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
import {CategoryEnum, StatusEnum, TypeResource, TypeResourceList} from './templates.model';
import {QSHelper} from '../utils/qs.helper';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import {TemplatesService, TemplatesServiceBase} from './templates.service';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    async getTemplate(category: CategoryEnum, templateId: string, status: StatusEnum, additionalHeaders?: RequestHeaders): Promise<TypeResource> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        const queryString = QSHelper.getQueryString({status});
        url += `?${queryString}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;

    }

    async createTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource,'resource', ow.object.nonEmpty);
        ow(resource.templateId,'templateId', ow.string.nonEmpty);
        ow(resource.category,'category', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(resource.category, resource.templateId)}`;

        delete resource.templateId;
        delete resource.category;

        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(resource);
    }

    async updateTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource,'resource', ow.object.nonEmpty);
        ow(resource.templateId,'templateId', ow.string.nonEmpty);
        ow(resource.category,'category', ow.string.nonEmpty);

        const templateId = resource.templateId;
        const category = resource.category;
        delete resource.templateId;
        delete resource.category;

        const url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        await request.patch(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async publishTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.publishTemplateRelativeUrl(category, templateId)}`;

        await request.put(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async deleteTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listTemplates(category: CategoryEnum, status?: string, offset?: number, count?: number, additionalHeaders?: RequestHeaders): Promise<TypeResourceList> {
        ow(category,'category', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.templatesRelativeUrl(category)}`;
        const queryString = QSHelper.getQueryString({status, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;
    }
}
