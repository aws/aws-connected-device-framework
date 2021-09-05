/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { inject, injectable } from 'inversify';

import { logger } from '../utils/logger';

import {CustomResourceEvent} from './customResource.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { CustomResource } from './customResource';
import ow from 'ow';

@injectable()
export class EventSourceCustomResource implements CustomResource {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {}

    protected headers:{[key:string]:string};

    public async create(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`EventSourceCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);

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
            .setBody(body?.eventSource);

        let response;
        try {
            response = await this.lambdaInvoker.invoke(functionName, apiEvent);
        } catch (err) {
            return response;
        }
        
        const eventSourceLocation = response?.header?.location;
        
        if (!eventSourceLocation){
            logger.debug(`EventSourceCustomResource: create: eventSourceLocation: null`);
            return response;
        }
        
        if (!body.eventSourceEvents) {
            logger.debug(`EventSourceCustomResource: create: body.eventSourceEvents: null`);
            return response;
        }
        const invocationPromises = body.eventSourceEvents.map((singleEvent: unknown)  => {
            logger.debug(`EventSourceCustomResource: create: event: ${JSON.stringify(singleEvent)}`);
            
            // create the event
            const apiEvent = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath(`${eventSourceLocation}/events`)
                .setHeaders(headers)
                .setBody(singleEvent);
                
            return this.lambdaInvoker.invoke(functionName, apiEvent);
        });

        Promise.allSettled(invocationPromises).then((results: any) => {
            results.forEach((result: any) => {
                logger.debug(`EventSourceCustomResource: create: result: ${JSON.stringify(result)}`);    
            });
        });
        
        return response;

    }

    public async update(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`EventSourceCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        // no update
        return {};
    }

    public async delete(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`EventSourceCustomResource: delete: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        // no deleet
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