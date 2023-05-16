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

import { CustomResourceEvent } from './customResource.model';
import {
    LambdaInvokerService,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
} from '@aws-solutions/cdf-lambda-invoke';
import { CustomResource } from './customResource';
import ow from 'ow';

@injectable()
export class AssetLibraryPolicyCustomResource implements CustomResource {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {}

    protected headers: { [key: string]: string };

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `AssetLibraryPolicyCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );

        const functionName = customResourceEvent.ResourceProperties.FunctionName;
        const contentType = customResourceEvent.ResourceProperties.ContentType;
        const policyId = customResourceEvent.ResourceProperties.PolicyId;
        const rawBody = customResourceEvent.ResourceProperties.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(policyId, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const path = `/policies/${policyId}`;
        const body = JSON.parse(rawBody);

        // does policy already exist?
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

        logger.debug(`AssetLibraryPolicyCustomResource: create: exists: ${exists}`);

        // if it does not exist, create it, else update the existing one
        let event;
        if (!exists) {
            event = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath('/policies')
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
            `AssetLibraryPolicyCustomResource: create: create/update res: ${JSON.stringify(res)}`
        );

        return res;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `AssetLibraryPolicyCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent
            )}`
        );
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
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
