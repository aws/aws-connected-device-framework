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

import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import config from 'config';
import { TemplateModel } from './templates.models';

@injectable()
export class TemplatesService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('commands.baseUrl') as string;

        if (config.has('commands.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('commands.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }
    }

    public async createTemplate(template:TemplateModel): Promise<void> {
        ow(template, ow.object.nonEmpty);

        await request.post(this.baseUrl + '/templates')
            .send(template)
            .set(this.headers);
    }

    public async getTemplate(templateId:string): Promise<TemplateModel> {
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', templateId);
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async listTemplates(): Promise<TemplateModel> {

        const res = await request.get(this.baseUrl + '/templates')
            .set(this.headers);

        return res.body;
    }

    public async updateTemplate(template:TemplateModel): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.templateId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', template.templateId);

        const res = await request.patch(url)
            .send(template)
            .set(this.headers);

        return res.body;
    }

    public async deleteTemplate(templateId:string): Promise<void> {
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('templates', templateId);

       await request.delete(url)
            .set(this.headers);
    }

}
