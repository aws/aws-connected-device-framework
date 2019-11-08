/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import { TypeResource, CategoryEnum, TypeResourceList, StatusEnum } from './templates.model';
import { QSHelper } from '../utils/qs.helper';
import * as request from 'superagent';
import { ClientService } from './common.service';

@injectable()
export class TemplatesService extends ClientService {

    public constructor() {
        super();
    }

    public async getTemplate(category:CategoryEnum, templateId:string, status:StatusEnum): Promise<TypeResource> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('templates', category, templateId);
        const queryString = QSHelper.getQueryString({status});
        url += `?${queryString}`;

        const res = await request.get(url)
        .set(super.getHeaders());

        return res.body;

    }

    public async createTemplate(resource:TypeResource): Promise<void> {
        ow(resource, ow.object.nonEmpty);
        ow(resource.templateId, ow.string.nonEmpty);
        ow(resource.category, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', resource.category, resource.templateId);

        delete resource.templateId;
        delete resource.category;

        await request.post(url)
            .set(super.getHeaders())
            .send(resource);
    }

    public async updateTemplate(resource:TypeResource): Promise<void> {
        ow(resource, ow.object.nonEmpty);
        ow(resource.templateId, ow.string.nonEmpty);
        ow(resource.category, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', resource.category, resource.templateId);
        await request.patch(url)
        .set(super.getHeaders());
    }

    public async publishTemplate(category:CategoryEnum, templateId:string): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', category, templateId, 'publish');

        await request.put(url)
        .set(super.getHeaders());
    }

    public async deleteTemplate(category:CategoryEnum, templateId:string): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', category, templateId);
        await request.delete(url)
        .set(super.getHeaders());
    }

    public async listTemplates(category:CategoryEnum, status?:string, offset?:number, count?:number): Promise<TypeResourceList> {
        ow(category, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('templates', category);
        const queryString = QSHelper.getQueryString({status, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
        .set(super.getHeaders());
        return res.body;
    }

}
