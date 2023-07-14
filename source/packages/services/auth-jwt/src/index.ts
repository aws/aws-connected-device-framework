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
import '@awssolutions/cdf-config-inject';
import { Context, CustomAuthorizerEvent } from 'aws-lambda';
import ow from 'ow';

import * as Errors from '@awssolutions/cdf-errors';

import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';
import { APIGWAuthPolicyBuilder } from './api-gw.policy.builder';
import { logger } from './utils/logger';

const _awsRegion = process.env.AWS_REGION;
const _apiGwCustomAuth = new ApiGwCustomAuthorizer();

/**
 * Lambda entry point for Custom Authorizer.
 */
export async function handler(event: CustomAuthorizerEvent, context: Context): Promise<void> {
    logger.debug(
        `index: handler: in: event:${JSON.stringify(event)}, context:${JSON.stringify(context)}`,
    );

    ow(event, ow.object.nonEmpty);
    ow(event.authorizationToken, ow.string.nonEmpty);

    try {
        const token = event.authorizationToken;
        const awsAccountId = getAccountId(context);
        const apiId = getApiId(event);

        const apiOptions = {
            region: _awsRegion,
            apiId,
        };
        const authCheck = await _apiGwCustomAuth.verify({ token });
        const policy = new APIGWAuthPolicyBuilder('user', awsAccountId, apiOptions);
        if (authCheck.isValid) {
            policy.allowAllMethods();
        } else {
            policy.denyAllMethods();
        }
        const apigwPolicy = policy.build();

        logger.debug(`index: handler: apigwPolicy:${JSON.stringify(apigwPolicy)}`);

        context.succeed(apigwPolicy);
    } catch (err) {
        logger.debug(`index: handler: err: ${err.message}`);
        context.fail('Unauthorized');
    }
}

function getAccountId(context: Context) {
    // extract account number from invoked arn
    const invokedFnArn = context.invokedFunctionArn;
    const invokedFnArnParsed = invokedFnArn ? invokedFnArn.split(':') : null;
    logger.info(`${invokedFnArn}`, 'function ARN');
    logger.info(`${invokedFnArnParsed}`, 'parsed function ARN');
    // this should only happen in testing mode
    if (!invokedFnArn || !invokedFnArnParsed || invokedFnArnParsed.length < 5) {
        throw new Error('Could not derive account id from context.');
    }
    return invokedFnArnParsed[4];
}

function getApiId(event: CustomAuthorizerEvent) {
    let apiId;
    if (event.requestContext) {
        apiId = event.requestContext.apiId;
    }
    if (!apiId) {
        const match = /^[^:]+:[^:]+:[^:]+:[^:]+:\d+:(\w+)/.exec(event.methodArn);

        if (!match) {
            throw new Errors.InvalidArgumentError('appId', 'could not be derived');
        }
        apiId = match[1];

        if (!apiId) {
            throw new Errors.InvalidArgumentError('apiId', 'could not be extracted');
        }
    }
    logger.debug(`index: getApiId: apiId: ${apiId}`);
    return apiId;
}
