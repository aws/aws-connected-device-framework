/*-------------------------------------------------------------------------------
 # Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 #
 # This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
 #-------------------------------------------------------------------------------*/

import * as AWS from 'aws-sdk';

import { inject, injectable } from 'inversify';
import createHttpError from 'http-errors';

import { LAMBDAINVOKE_TYPES } from './di/types';
import { logger } from './utils/logger';

import {LambdaApiGatewayEventBuilder, LambdaApiGatewayEventResponse} from './lambdainvoker.model';

@injectable()
export class LambdaInvokerService {

    private lambda: AWS.Lambda;

    public constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaFactory) lambdaFactory: () => AWS.Lambda,
    ) {
        this.lambda = lambdaFactory();
    }

    public async invoke(functionName: string, apiEvent: LambdaApiGatewayEventBuilder) {
        logger.debug(`LambdaUtil.invoke: apiEvent: ${JSON.stringify(apiEvent)}`);

        const invokeRequest: AWS.Lambda.InvocationRequest = {
            FunctionName: functionName,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(apiEvent)
        };

        const invokeResponse: AWS.Lambda.InvocationResponse = await this.lambda.invoke(invokeRequest).promise();
        logger.debug(`invokeResponse: ${JSON.stringify(invokeResponse)}`);

        if (invokeResponse.StatusCode >= 200 && invokeResponse.StatusCode < 300 ) {
            const response = new LambdaApiGatewayEventResponse(invokeResponse.Payload);
            logger.debug(`payload: ${JSON.stringify(response)}`);

            if (response.status > 300) {
                const error = createHttpError(response.status);
                error.status = response.status;
                error.response = response;
                throw error;
            }

            return response;
        } else {
            const error = createHttpError(invokeResponse.StatusCode);
            error.status = invokeResponse.StatusCode;
            throw error;
        }

    }
}
