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

import { logger } from '../utils/logger';

import {CustomResourceEvent} from './customResource.model';
import {
    LambdaInvokerService,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
} from '@awssolutions/cdf-lambda-invoke';
import { CustomResource } from './customResource';
import ow from 'ow';

@injectable()
export class CommandsTemplateCustomResource implements CustomResource {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {}

    protected headers:{[key:string]:string};

    public async create(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`CommandsTemplateCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);

        const functionName = customResourceEvent.ResourceProperties.FunctionName;
        const contentType = customResourceEvent.ResourceProperties.ContentType;
        const templateId = customResourceEvent.ResourceProperties.TemplateId;
        const rawBody = customResourceEvent.ResourceProperties.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const path = `/templates/${templateId}`;
        const body = JSON.parse(rawBody);

        const getEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(path)
            .setHeaders(headers);

        let exists;
        try {
            const response = await this.lambdaInvoker.invoke(functionName, getEvent);
            exists = (response.status === 200);
        } catch (err) {
            if (err.status === 404) {
                exists = false;
            }
        }

        logger.debug(`CommandsTemplateCustomResource: create: exists: ${exists}`);

        // if it does not exist, create it
        let event;
        if (!exists) {
           event = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath('/templates')
                .setHeaders(headers)
                .setBody(body);
        }
        const res = await this.lambdaInvoker.invoke(functionName, event);
        logger.debug(`CommandsTemplateCustomResource: create: create/update res: ${JSON.stringify(res)}`);

        return res;

    }

    public async update(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`CommandsTemplateCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        // no update
        return {};
    }

    public async delete(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`CommandsTemplateCustomResource: delete: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        // no delete
        return {};
    }

    protected getHeaders(contentType:string): {[key:string]:string} {
        if (this.headers===undefined) {
            const h = {
                'Accept': contentType,
                'Content-Type': contentType
            };
            this.headers = {...h};
        }
        return this.headers;
    }

}
