/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { TemplatesServiceBase, TemplatesService } from './templates.service';
import { DeploymentTemplate, DeploymentTemplateList } from './templates.model';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassDeployment.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async saveTemplate(template: DeploymentTemplate, additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplate> {

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(template.name))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(template);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }

    async getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplate> {

        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listTemplates(additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplateList> {

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templatesRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<void> {

        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(name))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

}
