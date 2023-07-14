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
export class CommandsCommandCustomResource implements CustomResource {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {}

    protected headers: { [key: string]: string };

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `CommandsCommandCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const functionName = customResourceEvent.ResourceProperties.FunctionName;
        const contentType = customResourceEvent.ResourceProperties.ContentType;
        const rawBody = customResourceEvent.ResourceProperties.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const body = JSON.parse(rawBody);

        // create the command
        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath('/commands')
            .setHeaders(headers)
            .setBody(body);

        const res = await this.lambdaInvoker.invoke(functionName, event);
        logger.debug(`CommandsCommandCustomResource: create: create res: ${JSON.stringify(res)}`);

        // publish it
        const commandLocation = res.header.location;
        const publishEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('PATCH')
            .setPath(commandLocation)
            .setHeaders(headers)
            .setBody({
                commandStatus: 'PUBLISHED',
            });

        const publishRes = await this.lambdaInvoker.invoke(functionName, publishEvent);
        logger.debug(
            `CommandsCommandCustomResource: create: publishRes: ${JSON.stringify(publishRes)}`,
        );

        return publishRes;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `CommandsCommandCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        // no update
        return {};
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `CommandsCommandCustomResource: delete: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        // no deleet
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
