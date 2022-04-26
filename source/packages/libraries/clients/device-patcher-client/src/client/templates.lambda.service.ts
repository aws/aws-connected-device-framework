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
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { TemplatesServiceBase, TemplatesService } from './templates.service';
import { CreatePatchTemplateParams, PatchTemplate, PatchTemplateList } from './templates.model';

@injectable()
export class TemplatesLambdaService extends TemplatesServiceBase implements TemplatesService {

    private functionName : string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.DEVICE_PATCHER_API_FUNCTION_NAME;
    }

    async createTemplate(_template: CreatePatchTemplateParams, _additionalHeaders?:RequestHeaders) : Promise<void> {
        // files cannot be passed via multipart/form-data with the direct lambda invocation.
        // This requires extension of the API to support the content-type=json header with file content passed as a buffer
        throw('NOT_IMPLEMENTED');
    }

    async updateTemplate(_template: CreatePatchTemplateParams, _additionalHeaders?:RequestHeaders) : Promise<void> {
        // files cannot be passed via multipart/form-data with the direct lambda invocation.
        // This requires extension of the API to support the content-type=json header with file content passed as a buffer
        throw('NOT_IMPLEMENTED');
    }

    async getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<PatchTemplate> {

        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.templateRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listTemplates(additionalHeaders?:RequestHeaders) : Promise<PatchTemplateList> {

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
