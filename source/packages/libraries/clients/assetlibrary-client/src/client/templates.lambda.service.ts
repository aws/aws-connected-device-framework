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
import {
    Dictionary,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@cdf/lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { CategoryEnum, StatusEnum, TypeResource, TypeResourceList } from './templates.model';
import { TemplatesService, TemplatesServiceBase } from './templates.service';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARY_API_FUNCTION_NAME;
    }

    async getTemplate(
        category: CategoryEnum,
        templateId: string,
        status: StatusEnum,
        additionalHeaders?: RequestHeaders
    ): Promise<TypeResource> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setQueryStringParameters({ status })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async createTemplate(
        resource: TypeResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(resource, 'resource', ow.object.nonEmpty);
        ow(resource.templateId, 'templateId', ow.string.nonEmpty);
        ow(resource.category, 'category', ow.string.nonEmpty);

        const url = super.templateRelativeUrl(resource.category, resource.templateId);

        const body = Object.assign({}, resource);
        delete body.templateId;
        delete body.category;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(url)
            .setMethod('POST')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async updateTemplate(
        resource: TypeResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(resource, 'resource', ow.object.nonEmpty);
        ow(resource.templateId, 'templateId', ow.string.nonEmpty);
        ow(resource.category, 'category', ow.string.nonEmpty);

        const url = super.templateRelativeUrl(resource.category, resource.templateId);
        const body = Object.assign({}, resource);
        delete body.templateId;
        delete body.category;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(url)
            .setMethod('PATCH')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async publishTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.publishTemplateRelativeUrl(category, templateId))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deleteTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(category, 'category', ow.string.nonEmpty);
        ow(templateId, 'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listTemplates(
        category: CategoryEnum,
        status?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<TypeResourceList> {
        ow(category, 'category', ow.string.nonEmpty);

        const qs: Dictionary = {};
        if (status) {
            qs.status = status;
        }
        if (offset) {
            qs.offset = `${offset}`;
        }
        if (count) {
            qs.count = `${count}`;
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templatesRelativeUrl(category))
            .setQueryStringParameters(qs)
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
