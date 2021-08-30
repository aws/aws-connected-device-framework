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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {CategoryEnum, StatusEnum, TypeResource, TypeResourceList} from './templates.model';
import {RequestHeaders} from './common.model';
import {TemplatesService, TemplatesServiceBase} from './templates.service';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService, QueryStringParametersDictionary} from '@cdf/lambda-invoke';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibrary.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async getTemplate(category: CategoryEnum, templateId: string, status: StatusEnum, additionalHeaders?: RequestHeaders): Promise<TypeResource> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setQueryStringParameters({status})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }

    async createTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource,'resource', ow.object.nonEmpty);
        ow(resource.templateId,'templateId', ow.string.nonEmpty);
        ow(resource.category,'category', ow.string.nonEmpty);

        const templateId = resource.templateId;
        const category = resource.category;
        delete resource.templateId;
        delete resource.category;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setMethod('POST')
            .setBody(resource)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async updateTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(resource,'resource', ow.object.nonEmpty);
        ow(resource.templateId,'templateId', ow.string.nonEmpty);
        ow(resource.category,'category', ow.string.nonEmpty);

        const templateId = resource.templateId;
        const category = resource.category;
        delete resource.templateId;
        delete resource.category;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setMethod('PATCH')
            .setBody(resource)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async publishTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.publishTemplateRelativeUrl(category, templateId))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deleteTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(category,'category', ow.string.nonEmpty);
        ow(templateId,'templateId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(category, templateId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listTemplates(category: CategoryEnum, status?: string, offset?: number, count?: number, additionalHeaders?: RequestHeaders): Promise<TypeResourceList> {
        ow(category,'category', ow.string.nonEmpty);
        
        const qs: QueryStringParametersDictionary = {};
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
            .setQueryStringParameters({
                status,
                offset:`${offset}`,
                count:`${count}`
            })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
