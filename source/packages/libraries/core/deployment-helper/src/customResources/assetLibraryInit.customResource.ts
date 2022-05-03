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
import { sign } from 'jsonwebtoken'
import { logger } from '../utils/logger';

import { CustomResourceEvent } from './customResource.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { CustomResource } from './customResource';

const DEFAULT_SECRET = 'XfDKQoegNG'

@injectable()
export class AssetLibraryInitCustomResource implements CustomResource {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) { }

    protected headers: { [key: string]: string };
    private DEFAULT_MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';
    private mimeType: string = this.DEFAULT_MIME_TYPE;

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(`AssetLibraryInitCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        const endpoint = customResourceEvent.ResourceProperties.FunctionName;
        await this.init(endpoint, 5000, 60);
        return {};
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(`AssetLibraryInitCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }

    private async init(functionName: string, retryDelay: number, retryMaxCount: number): Promise<void> {

        logger.debug(`AssetLibraryInitCustomResource: init: in: functionName:${functionName}, retryDelay:${retryDelay}, retryMaxCount: {retryMaxCount}`);

        let requestCount = 0;

        const timeout = async (ms: number) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        const _init = async (): Promise<void> => {
            logger.debug(`AssetLibraryInitCustomResource: _init: in`);
            try {
                const event = new LambdaApiGatewayEventBuilder()
                    .setPath('/48e876fe-8830-4996-baa0-9c0dd92bd6a2/init')
                    .setMethod('POST')
                    .setHeaders(this.getHeaders());

                const res = await this.lambdaInvoker.invoke(functionName, event);
                const statusCode = res.status;

                if (statusCode === 204 || statusCode === 409) {
                    logger.debug(`AssetLibraryInitCustomResource: _init: ${res.body}`);
                    return;
                }

            } catch (err) {

                logger.error(`AssetLibraryInitCustomResource: _init: ${JSON.stringify(err)}`);

                if (err.status === 409) {
                    return;
                }

                if (retryMaxCount === requestCount) {
                    throw new Error('RetryLimitException');
                }

                if ((err.timeout || err.status === 504 || err.status === 500) && requestCount <= retryMaxCount) {
                    logger.error(`AssetLibraryInitCustomResource: _init: retrying: count: ${requestCount}`);
                    requestCount += 1;
                    await timeout(retryDelay);
                    await _init();
                } else {
                    throw new Error('InitException');
                }
            }
        };
        return _init();
    }

    protected getHeaders(): { [key: string]: string } {
        if (this.headers === undefined) {
            const h = {
                'Accept': this.mimeType,
                'Content-Type': this.mimeType,
                'Authorization': sign({ cdf_al: ["/:*"] }, DEFAULT_SECRET)
            };
            this.headers = { ...h };
        }
        return this.headers;
    }
}
