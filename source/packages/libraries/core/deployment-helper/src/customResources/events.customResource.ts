/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
export class EventsCustomResource implements CustomResource {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {}

    protected headers: { [key: string]: string };

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventsCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const functionName = customResourceEvent?.ResourceProperties?.FunctionName;
        const contentType = customResourceEvent?.ResourceProperties?.ContentType;
        const rawBody = customResourceEvent?.ResourceProperties?.Body;
        const eventSourceId = customResourceEvent?.ResourceProperties?.EventSourceId;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const body = JSON.parse(rawBody);

        const invocationPromises = body.map((singleEvent: unknown) => {
            logger.debug(`EventsCustomResource: create: event: ${JSON.stringify(singleEvent)}`);

            // create the event
            const apiEvent = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath(`/eventsources/${eventSourceId}/events`)
                .setHeaders(headers)
                .setBody(singleEvent);

            return this.lambdaInvoker.invoke(functionName, apiEvent);
        });

        /* eslint @typescript-eslint/no-explicit-any: 0 */
        const responses = Promise.allSettled(invocationPromises).then((results: any) => {
            results.forEach((result: unknown) => {
                logger.debug(`EventsCustomResource: create: result: ${JSON.stringify(result)}`);
            });
        });

        return responses;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventsCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        return await this.create(customResourceEvent);
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `EventsCustomResource: delete: in: customResourceEvent: ${JSON.stringify(
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
