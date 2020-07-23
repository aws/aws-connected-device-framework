/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { TemplatesServiceBase, TemplatesService } from './templates.service';
import { Template, TemplateList } from './templates.model';

@injectable()
export class TemplatesApigwService extends TemplatesServiceBase implements TemplatesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async saveTemplate(template: Template, additionalHeaders?:RequestHeaders) : Promise<Template> {
        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        const url = `${this.baseUrl}${super.templateRelativeUrl(template.name)}`;

        const res = await request.put(url)
            .send(template)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

    async getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<Template> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.templateRelativeUrl(name)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

    async listTemplates(additionalHeaders?:RequestHeaders) : Promise<TemplateList> {

        const url = `${this.baseUrl}${super.templatesRelativeUrl()}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }
}
