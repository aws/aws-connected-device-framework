/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import * as Lambda from './index';

import AWS from 'aws-sdk';
import { ApiGwCustomAuthorizer } from './api-gw.custom.authorizer';

const region = 'us-xxxx-1';
let mockedSsm: AWS.SSM;
let apiGwCustomAuthorizerInstance: ApiGwCustomAuthorizer;

describe('Cust Auth lambda', () => {
  beforeEach(() => {
    mockedSsm = new AWS.SSM();
    apiGwCustomAuthorizerInstance = new ApiGwCustomAuthorizer(
      region,
      mockedSsm
    );
    Lambda.setAwsRegion(region);
    Lambda.setApiGwCustomAuthorizer(apiGwCustomAuthorizerInstance);
  });

  // this.timeout(15000);
  describe('handler', () => {
    it('should authorize service API call when passed A valid access_token!!!!!!!', done => {
      const apiID = ' acb123efg';
      const accessToken = '1234567890';
      const transactionID = 'unit-test-transaction-id';
      // const principalID = 'unit-test-principal-id';
      const context = {
        apiId: apiID,
        functionName: 'mock-lambda-dev',
        invokedFunctionArn:
          'arn:aws:lambda:eu-west-1:123456789:function:mylambda:prod'
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
      //         SourceAccount: '111122223333',
      //         StatementId: 'unit_test'
      //       }
      //     ]
      //   }
      // };

      const ssmParam = {
        Parameter: {
          Name:
            'cdf-rootca-pem',
          Type: 'SecureString',
          Value: 'ABCDEDGHIJKLMNOPQRSTUVWXYZ',
          Version: 1
        }
      };
      mockedSsm.getParameter = jest.fn().mockImplementationOnce(() => {
        return {
          promise: () => ssmParam
        };
      });

      const event = {
        type: 'REQUEST',
        authorizationToken: `Bearer ${accessToken}`,
        methodArn: `arn:aws:execute-api:local:123456789:${apiID}/dev/POST/connect/blobrepository/Blob`,
        requestContext: {
          requestId: transactionID
        }
      };
      Lambda.handler(event, context, (policy: any) => {
        expect(policy).toBeDefined();
        logger.debug('returned resp ', policy);
        done();
      });
    });
  });
});
