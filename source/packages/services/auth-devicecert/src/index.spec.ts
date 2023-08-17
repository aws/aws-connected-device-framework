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

import * as Lambda from './index';

import AWS from 'aws-sdk';
import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';

const region = 'us-xxxx-1';
let mockedSsm: AWS.SSM;
let apiGwCustomAuthorizerInstance: ApiGwCustomAuthorizer;

describe('Cust Auth lambda', () => {
    beforeEach(() => {
        mockedSsm = new AWS.SSM();
        apiGwCustomAuthorizerInstance = new ApiGwCustomAuthorizer(region, mockedSsm);
        Lambda.setAwsRegion(region);
        Lambda.setApiGwCustomAuthorizer(apiGwCustomAuthorizerInstance);
    });

    // this.timeout(15000);
    describe('handler', () => {
        it('should authorize service API call when passed A valid access_token!!!!!!!', (done) => {
            const apiID = ' acb123efg';
            const accessToken = '1234567890';
            const transactionID = 'unit-test-transaction-id';
            // const principalID = 'unit-test-principal-id';
            const context = {
                apiId: apiID,
                functionName: 'mock-lambda-dev',
                invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789:function:mylambda:prod',
            };
            // const response = {
            //   principalId: principalID,
            //   policyDocument: {
            //     Statement: [
            //       {
            //         Action: 'execute-api:Invoke',
            //         Effect: 'Allow',
            //         Principal: '*',
            //         Resource: `arn:aws:execute-api:*:*:${apiID}/*`,
            //         SourceAccount: 'xxxxxxxxxx',
            //         StatementId: 'unit_test'
            //       }
            //     ]
            //   }
            // };

            const ssmParam = {
                Parameter: {
                    Name: 'cdf-rootca-pem',
                    Type: 'SecureString',
                    Value: 'ABCDEDGHIJKLMNOPQRSTUVWXYZ',
                    Version: 1,
                },
            };
            mockedSsm.getParameter = jest.fn().mockImplementationOnce(() => {
                return {
                    promise: () => ssmParam,
                };
            });

            const event = {
                type: 'REQUEST',
                authorizationToken: `Bearer ${accessToken}`,
                methodArn: `arn:aws:execute-api:local:123456789:${apiID}/dev/POST/connect/blobrepository/Blob`,
                requestContext: {
                    requestId: transactionID,
                },
            };
            Lambda.handler(event, context, (policy: any) => {
                expect(policy).toBeDefined();
                done();
            });
        });
    });
});
