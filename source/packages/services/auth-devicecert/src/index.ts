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
import { logger } from './utils/logger';
import * as Errors from '@awssolutions/cdf-errors';
import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';
import {APIGWAuthPolicyBuilder, ApiOptions, Policy} from './api-gw.policy.builder';

/**
 * overridable for unit testing
 */
let _apiGwCustomAuth : ApiGwCustomAuthorizer;
let _awsRegion:string;

export function setAwsRegion(awsRegion:string) : void {
    _awsRegion=awsRegion;
}
export function setApiGwCustomAuthorizer(apiGwCustomAuth:ApiGwCustomAuthorizer) : void {
    _apiGwCustomAuth=apiGwCustomAuth;
}

/**
 * Lambda entry point for Custom Authorizer.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export async function handler(event: any, context: any, callback: any) : Promise<Policy>{
    logger.info(`handler input : ${JSON.stringify({ Context: context, Event: event })}`);

    if (_awsRegion===undefined) {
        _awsRegion = process.env.AWS_REGION;
    }
    if (_apiGwCustomAuth===undefined) {
        _apiGwCustomAuth = new ApiGwCustomAuthorizer(_awsRegion);
    }

    try {
        // Get Account ID
        const awsAccountId = getAccountId(context);
        if (!awsAccountId) {
            callback(new Error('Could not derive account id from context.'));
            return undefined;
        }
        // Get API ARN
        let apiId = event.requestContext.apiId;
        if (!apiId) {
            const match = /^[^:]+:[^:]+:[^:]+:[^:]+:\d+:(\w+)/.exec(event.methodArn);

            if (!match) {
                callback(new Errors.InvalidArgumentError('appId', 'could not be derived'));
                return undefined;
            }
            apiId = match[1];

            if (!apiId) {
                callback(new Errors.InvalidArgumentError('apiId', 'could not be extracted'));
                return undefined;
            }
        }
        const apiOptions:ApiOptions = {
            region: _awsRegion,
            apiId
        };
        const devicecert = event.headers.devicecert;
        const deviceid = event.headers.deviceid;
        const authorizeApiResponse = await _apiGwCustomAuth.authorizeApiRequestForCert(devicecert);
        const policy = new APIGWAuthPolicyBuilder(deviceid, awsAccountId, apiOptions);
        if (authorizeApiResponse === false) {
            policy.denyAllMethods();
        } else {
            policy.allowAllMethods();
        }
        return  policy.build();
    } catch (err) {
        logger.info(`$$$$$ Authorizer ERR: ${JSON.stringify(err)}`);
       throw err;
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
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
