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
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TemplateModel } from './templates.models';
import { RequestHeaders } from './commands.model';
import { TemplatesService, TemplatesServiceBase } from './templates.service';
import {
    LambdaApiGatewayEventBuilder,
    LAMBDAINVOKE_TYPES,
    LambdaInvokerService,
} from '@aws-solutions/cdf-lambda-invoke';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.COMMANDS_API_FUNCTION_NAME;
    }
    async createTemplate(
        template: TemplateModel,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templatesRelativeUrl())
            .setMethod('POST')
            .setBody(template)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async getTemplate(
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<TemplateModel> {
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(templateId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listTemplates(additionalHeaders?: RequestHeaders): Promise<TemplateModel> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templatesRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async updateTemplate(
        template: TemplateModel,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(template, ow.object.nonEmpty);
        ow(template.templateId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(template.templateId))
            .setMethod('PATCH')
            .setBody(template)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(templateId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
