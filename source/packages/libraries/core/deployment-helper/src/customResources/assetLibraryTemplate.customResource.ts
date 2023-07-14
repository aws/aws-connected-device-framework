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

import { logger } from '@awssolutions/simple-cdf-logger';

import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import ow from 'ow';
import { CustomResource } from './customResource';
import { CustomResourceEvent } from './customResource.model';

@injectable()
export class AssetLibraryTemplateCustomResource implements CustomResource {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {}

    protected headers: { [key: string]: string };

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `AssetLibraryTemplateCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );

        const functionName = customResourceEvent.ResourceProperties.FunctionName;
        const contentType = customResourceEvent.ResourceProperties.ContentType;
        const category = customResourceEvent.ResourceProperties.Category;
        const templateId = customResourceEvent.ResourceProperties.TemplateId;
        const rawBody = customResourceEvent.ResourceProperties.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const path = `/templates/${category}/${templateId}`;
        const body = JSON.parse(rawBody);

        // does type already exist?
        const getEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(path)
            .setHeaders(headers);

        let exists;
        try {
            const response = await this.lambdaInvoker.invoke(functionName, getEvent);
            exists = response.status === 200;
        } catch (err) {
            if (err.status === 404) {
                exists = false;
            }
        }

        logger.debug(`AssetLibraryTemplateCustomResource: create: exists: ${exists}`);

        // if it does not exist, create it, else update the existing one
        let event;
        if (!exists) {
            event = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath(path)
                .setHeaders(headers)
                .setBody(body);
        } else {
            event = new LambdaApiGatewayEventBuilder()
                .setMethod('PATCH')
                .setPath(path)
                .setHeaders(headers)
                .setBody(body);
        }
        const res = await this.lambdaInvoker.invoke(functionName, event);
        logger.debug(
            `AssetLibraryTemplateCustomResource: create: create/update res: ${JSON.stringify(res)}`
        );

        // finally, publish it
        const publishEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('PUT')
            .setPath(`${path}/publish`)
            .setHeaders(headers)
            .setBody(body);
        const publishRes = await this.lambdaInvoker.invoke(functionName, publishEvent);
        logger.debug(
            `AssetLibraryTemplateCustomResource: create: publish res: ${JSON.stringify(
                publishRes
            )}`
        );

        return publishRes;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `AssetLibraryTemplateCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );
        return await this.create(customResourceEvent);
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const functionName = customResourceEvent.ResourceProperties.FunctionName;
        const contentType = customResourceEvent.ResourceProperties.ContentType;
        const category = customResourceEvent.ResourceProperties.Category;
        const templateId = customResourceEvent.ResourceProperties.TemplateId;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const path = `/templates/${category}/${templateId}`;

        const deleteEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('DELETE')
            .setPath(path)
            .setHeaders(headers);

        let response;
        try {
            response = await this.lambdaInvoker.invoke(functionName, deleteEvent);
        } catch (err) {
            if (err.status === 404) {
                return response;
            }
            return response;
        }
        return response;
    }

    protected getHeaders(contentType: string): { [key: string]: string } {
        if (this.headers === undefined) {
            const h = {
                Accept: contentType,
                'Content-Type': contentType,
            };
            this.headers = { ...h };
        }
        return this.headers;
    }
}
