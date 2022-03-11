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
import {RequestHeaders} from './common.model';
import {LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder} from '@cdf/lambda-invoke';
import {TemplatesServiceBase, TemplatesService} from './templates.service';
import {Template, NewTemplate} from './templates.model';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {

    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.GREENGRASS2PROVISIONING_API_FUNCTION_NAME;
    }

    async createTemplate(template: NewTemplate, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templatesRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(template);

        await this.lambdaInvoker.invoke(this.functionName, event);

    }

    async updateTemplate(template: NewTemplate, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(template.name))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(template);

        await this.lambdaInvoker.invoke(this.functionName, event);

    }

    async getLatestTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<Template> {

        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteTemplate(name: string, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(name))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

}
