/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';

import { CustomResourceEvent } from './customResource.model';
import {
    LambdaInvokerService,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
} from '@awssolutions/cdf-lambda-invoke';
import { CustomResource } from './customResource';
import ow from 'ow';

@injectable()
export class EventSourceCustomResource implements CustomResource {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {}

    protected headers: { [key: string]: string };

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventSourceCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const functionName = customResourceEvent?.ResourceProperties?.FunctionName;
        const contentType = customResourceEvent?.ResourceProperties?.ContentType;
        const rawBody = customResourceEvent?.ResourceProperties?.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const body = JSON.parse(rawBody);

        // create the eventSource
        const apiEvent = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath('/eventsources')
            .setHeaders(headers)
            .setBody(body);

        let response;
        try {
            response = await this.lambdaInvoker.invoke(functionName, apiEvent);
        } catch (err) {
            return response;
        }

        const eventSourceId = response?.header?.location?.split('/');

        logger.debug(
            `EventSourceCustomResource: create: eventSourceId: ${
                eventSourceId[eventSourceId.length - 1]
            }`,
        );

        return { eventSourceId: eventSourceId[eventSourceId.length - 1] };
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventSourceCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        return await this.create(customResourceEvent);
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventSourceCustomResource: delete: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        // no delete
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
