/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {injectable} from 'inversify';
import config from 'config';
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
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    async getTemplate(category: CategoryEnum, templateId: string, status: StatusEnum, additionalHeaders?: RequestHeaders): Promise<TypeResource> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        const queryString = QSHelper.getQueryString({status});
        url += `?${queryString}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;

    }

    async createTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource, ow.object.nonEmpty);
        ow(resource.templateId, ow.string.nonEmpty);
        ow(resource.category, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(resource.category, resource.templateId)}`;

        delete resource.templateId;
        delete resource.category;

        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(resource);
    }

    async updateTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource, ow.object.nonEmpty);
        ow(resource.templateId, ow.string.nonEmpty);
        ow(resource.category, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(resource.category, resource.templateId)}`;
        await request.patch(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async publishTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.publishTemplateRelativeUrl(category, templateId)}`;

        await request.put(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async deleteTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(category, templateId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listTemplates(category: CategoryEnum, status?: string, offset?: number, count?: number, additionalHeaders?: RequestHeaders): Promise<TypeResourceList> {
        ow(category, ow.string.nonEmpty);

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
