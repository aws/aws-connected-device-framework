/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import * as Errors from '@cdf/errors';
import config from 'config';
import ow from 'ow';
import {APIGWAuthPolicyBuilder} from './api-gw.policy.builder';
import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';

let _awsRegion:string;
let _apiGwCustomAuth : ApiGwCustomAuthorizer;

/**
 * Lambda entry point for Custom Authorizer.
 */
export async function handler(event: any, context: any) {
    logger.debug(`index: handler: in: event:${JSON.stringify(event)}, context:${JSON.stringify(context)}`);

    ow(event, ow.object.nonEmpty);
    ow(event.authorizationToken, ow.string.nonEmpty);

    try {
        if (_awsRegion===undefined) {
            _awsRegion = config.get('aws.region') as string;
        }
        if (_apiGwCustomAuth===undefined) {
            _apiGwCustomAuth = new ApiGwCustomAuthorizer();
        }

        const token = event.authorizationToken;
        const awsAccountId = getAccountId(context);
        const apiId = getApiId(event);

        const apiOptions = {
            region: _awsRegion,
            apiId
        };
        const authCheck = await _apiGwCustomAuth.verify({token});
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

function getAccountId(context: any) {
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

function getApiId(event:any) {
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
