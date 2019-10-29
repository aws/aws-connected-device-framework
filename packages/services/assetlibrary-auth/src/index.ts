/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import * as Errors from '@cdf/errors';
import config from 'config';
import {APIGWAuthPolicyBuilder} from './api-gw.policy.builder';
import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';

/**
 * overridable for unit testing
 */
let _awsRegion:string;
let _jwtSecret:string;
let _apiGwCustomAuth : ApiGwCustomAuthorizer;

export function setAwsRegion(awsRegion:string) {
    _awsRegion=awsRegion;
}
export function setJwtSecret(jwtSecret:string) {
    _jwtSecret=jwtSecret;
}
export function setApiGwCustomAuthorizer(apiGwCustomAuth:ApiGwCustomAuthorizer) {
    _apiGwCustomAuth=apiGwCustomAuth;
}

/**
 * Lambda entry point for Custom Authorizer.
 */
export async function handler(event: any, context: any, callback: any) {
    logger.info(`handler input : ${JSON.stringify({ Context: context, Event: event })}`);

    if (_awsRegion===undefined) {
        _awsRegion = config.get('aws.region') as string;
    }
    if (_jwtSecret===undefined) {
        _jwtSecret = config.get('aws.ssm.jwtSecret.name') as string;
    }
    if (_apiGwCustomAuth===undefined) {
        _apiGwCustomAuth = new ApiGwCustomAuthorizer(_awsRegion);
    }

    try {
        // Get Account ID
        const awsAccountId = getAccountId(context);
        if (!awsAccountId) {
            callback(new Error('Could not derive account id from context.'));
            return;
        }
        // Get API ARN
        let apiId = event.requestContext.apiId;
        if (!apiId) {
            const match = /^[^:]+:[^:]+:[^:]+:[^:]+:\d+:(\w+)/.exec(event.methodArn);

            if (!match) {
                callback(new Errors.InvalidArgumentError('appId', 'could not be derived'));
                return;
            }
            apiId = match[1];

            if (!apiId) {
                callback(new Errors.InvalidArgumentError('apiId', 'could not be extracted'));
                return;
            }
        }
        const apiOptions = {
            region: _awsRegion,
            apiId
        };
        const token = event.authorizationToken;
        const isAuthorized = await _apiGwCustomAuth.verify(token);
        let apigwPolicy:object;
        const policy = new APIGWAuthPolicyBuilder('user', awsAccountId, apiOptions);
        if (isAuthorized === false) {
            policy.allowAllMethods();
        } else {
            policy.denyAllMethods();
        }
        apigwPolicy = policy.build();
        return callback(null, apigwPolicy);
    } catch (err) {
        logger.error(`index.ts: handler: unauthorized: ${JSON.stringify(err)}`);
        return callback('Unauthorized');
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
        return null;
    }
    return invokedFnArnParsed[4];
}
