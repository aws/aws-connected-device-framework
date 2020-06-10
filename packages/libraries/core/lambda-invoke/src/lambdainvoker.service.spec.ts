/*-------------------------------------------------------------------------------
 # Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 #
 # This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
 #-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS, { AWSError } from 'aws-sdk';

import { LambdaApiGatewayEventBuilder } from './lambdainvoker.model';
import { LambdaInvokerService } from './lambdainvoker.service';

describe('LambdaInvokeService', () => {

    let mockedLambda: AWS.Lambda;
    let instance: LambdaInvokerService;

    beforeEach(() => {
        mockedLambda = new AWS.Lambda();
        const mockedLambdaFactory = () => {
            return mockedLambda;
        };
        instance = new LambdaInvokerService(mockedLambdaFactory);
    });

    it('should invoke a lambda function', async () => {

        const functionName: string = 'test-api-function';
        const lambdaApiGatewayEvent: LambdaApiGatewayEventBuilder = new LambdaApiGatewayEventBuilder();

        const mockedLambdaApiGatewayResponse = {
            status: 201,
            body:{'certificatePem': '-----BEGIN CERTIFICATE---', 'resourceArns': {'certificate': 'arn:aws:iot:us-west-2:896502536262:cert/f9d865017f3ae942728d29333759c8e6a5299bb16d2d7dfa789cc175f5dd8412', 'thing': 'arn:aws:iot:us-west-2:896502536262:thing/test-core-150'}},
            header: {
                'access-control-allow-origin': '*',
                'x-powered-by': 'Express',
            }
        };

        const mockedLambdaInvokeResponse = new MockAWSPromise<AWS.Lambda.Types.InvocationResponse>();
        mockedLambdaInvokeResponse.response = {
            StatusCode: 200,
            Payload: '{"statusCode":201,"body":"{\\"certificatePem\\":\\"-----BEGIN CERTIFICATE---\\",\\"resourceArns\\":{\\"certificate\\":\\"arn:aws:iot:us-west-2:896502536262:cert/f9d865017f3ae942728d29333759c8e6a5299bb16d2d7dfa789cc175f5dd8412\\",\\"thing\\":\\"arn:aws:iot:us-west-2:896502536262:thing/test-core-150\\"}}","headers":{"x-powered-by":"Express","access-control-allow-origin":"*"}}',
            ExecutedVersion: '$LATEST'
        };

        const mockedLambdaInvokeCall = mockedLambda.invoke = <any> jest.fn()
            .mockReturnValueOnce(mockedLambdaInvokeResponse);

        const response = await instance.invoke(functionName, lambdaApiGatewayEvent);

        expect(response).toBeDefined();
        expect(mockedLambdaInvokeCall).toBeCalledTimes(1);
        expect(response.body).toEqual(mockedLambdaApiGatewayResponse.body);
        expect(response.status).toEqual(mockedLambdaApiGatewayResponse.status);
        expect(response.header).toEqual(mockedLambdaApiGatewayResponse.header);

        console.log(response);
    });

    it('should throw an error if status code is greater than 300', async () => {
        const functionName: string = 'test-api-function';
        const lambdaApiGatewayEvent: LambdaApiGatewayEventBuilder = new LambdaApiGatewayEventBuilder();

        const mockedLambdaInvokeResponse = new MockAWSPromise<AWS.Lambda.Types.InvocationResponse>();
        mockedLambdaInvokeResponse.response = {
            StatusCode: 400,
            FunctionError: 'ERROR',
            ExecutedVersion: '$LATEST'
        };

        const mockedLambdaInvokeCall = mockedLambda.invoke = <any> jest.fn()
            .mockReturnValueOnce(mockedLambdaInvokeResponse);

        let response;
        try {
            response = await instance.invoke(functionName, lambdaApiGatewayEvent);
        } catch (err) {
            expect(err.message).toEqual('Bad Request');
        }

        expect(response).toBeUndefined();
        expect(mockedLambdaInvokeCall).toBeCalledTimes(1);

    });
});

class MockAWSPromise<T> {
    public response: T;
    public error: AWSError = null;

    promise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
