/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { ThingsLambdaService } from './things.lambda.service';
import { LambdaApiGatewayEvent, LambdaInvokerService } from '@cdf/lambda-invoke';
import {
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse,
    CertificateStatus,
    ProvisionThingRequest,
    ProvisionThingResponse
} from './things.model';

describe('ThingsServiceLambda', () => {

    let instance: ThingsLambdaService;
    let mockedInvokerService: LambdaInvokerService;
    let mockedFunctionName: string;

    // mock lambda invoker
    beforeEach(() => {
        mockedFunctionName = 'provisioning_api_lambda_function_name';
        mockedInvokerService = createMockInstance(LambdaInvokerService);
        instance = new ThingsLambdaService(mockedInvokerService, mockedFunctionName);
    });

    it('should provision a thing', async() => {
        const mockedProvisionThingRequest: ProvisionThingRequest = {
            provisioningTemplateId: 'testTemplate',
            parameters: {
                ThingName: 'test-thing-001'
            },
            cdfProvisioningParameters: {
                certificatePem: '-----BEGIN CERTIFICATE-----\\\\nMIIDkjC....',
                certificateStatus: 'ACTIVE'
            }
        };

        const mockedProvisionThingResponse: ProvisionThingResponse = {
            certificatePem: '-----BEGIN CERTIFICATE-----\\\\nMIIDkjC....',
            resourceArns: {
                certificate: 'arn:aws:iot:us-west-2:896502536262:cert/f9d865017f3ae942728d29333759c8e6a5299bb16d2d7dfa789cc175f5dd8412',
                thing: 'arn:aws:iot:us-west-2:896502536262:thing/test-thing-001'
            }
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 201,
                body: mockedProvisionThingResponse,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                }
            };
        });

        const mockedLambdaApiGatewayEvent: LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: '/things',
            pathParameters: {
                'path': '/things'
            },
            httpMethod: 'POST',
            multiValueQueryStringParameters: null,
            body: JSON.stringify(mockedProvisionThingRequest),
            queryStringParameters: null,
        };

        const response = await instance.provisionThing(mockedProvisionThingRequest);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedProvisionThingResponse);

        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);

    });

    it('should get a thing', async() => {

        const mockedThingName = 'test-thing-001';

        const mockedThingResponse = {
            thingName: mockedThingName,
            arn: 'arn:aws:iot:us-west-2:896502536262:thing/test-thing-001',
            thingType: 'test-type',
            attributes: {
                foo: 'bar'
            }
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 200,
                body: mockedThingResponse,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                },
            };
        });

        const mockedLambdaApiGatewayEvent: LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: `/things/${mockedThingName}`,
            pathParameters: {
                'path': `/things/${mockedThingName}`
            },
            httpMethod: 'GET',
            multiValueQueryStringParameters: null,
            queryStringParameters: null,
            body: null,
        };

        const response = await instance.getThing(mockedThingName);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedThingResponse);

        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);
    });

    it('should delete a thing', async() => {
        const mockedThingName = 'test-thing-001';

        const mockedLambdaApiGatewayEvent: LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: `/things/${mockedThingName}`,
            pathParameters: {
                'path': `/things/${mockedThingName}`
            },
            httpMethod: 'DELETE',
            multiValueQueryStringParameters: null,
            queryStringParameters: null,
            body: null
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 204,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                }
            };
        });

        await instance.deleteThing(mockedThingName);

        expect(mockedInvokeCall).toBeCalledTimes(1);
        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);
    });

    it('should bulk provision things', async() => {
        const mockedBulkProvisionThingRequest: BulkProvisionThingsRequest = {
            provisioningTemplateId: 'test-template',
            parameters: [
                {'ThingName': 'test-device-001', 'ThingGroupName': 'xxx'},
                {'ThingName': 'test-device-002', 'ThingGroupName': 'xxx'},
                {'ThingName': 'test-device-003', 'ThingGroupName': 'xxx'}
            ]
        };

        const mockedBulkProvisionThingResponse: BulkProvisionThingsResponse = {
            taskId: '12345',
            creationDate: new Date(),
            lastModifiedDate: new Date(),
            status: 'SUCCESS',
            successCount: 3,
            failureCount: 0,
            percentageProgress: 100
        };

        const mockedLambdaApiGatewayEvent:LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: '/bulkthings',
            pathParameters: {
                'path': '/bulkthings'
            },
            httpMethod: 'POST',
            multiValueQueryStringParameters: null,
            queryStringParameters: null,
            body: JSON.stringify(mockedBulkProvisionThingRequest)
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 201,
                body: mockedBulkProvisionThingResponse,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                }
            };
        });

        const response = await instance.bulkProvisionThings(mockedBulkProvisionThingRequest);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedBulkProvisionThingResponse);

        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);
    });

    it('should get bulk provision task', async() => {

        const mockedTaskId = '12345';

        const mockedBulkProvisionThingResponse: BulkProvisionThingsResponse = {
            taskId: '12345',
            creationDate: new Date(),
            lastModifiedDate: new Date(),
            status: 'SUCCESS',
            successCount: 3,
            failureCount: 0,
            percentageProgress: 100
        };

        const mockedLambdaApiGatewayEvent:LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: `/bulkthings/${mockedTaskId}`,
            pathParameters: {
                'path': `/bulkthings/${mockedTaskId}`
            },
            httpMethod: 'GET',
            multiValueQueryStringParameters: null,
            queryStringParameters: null,
            body: null
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 200,
                body: mockedBulkProvisionThingResponse,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                }
            };
        });

        const response = await instance.getBulkProvisionTask(mockedTaskId);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedBulkProvisionThingResponse);

        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);

    });

    it('should update thing certificates', async() => {
        const mockedThingName = 'test-device-001';
        const mockedCertificateStatus:CertificateStatus = CertificateStatus.ACTIVE;

        const mockedLambdaApiGatewayEvent: LambdaApiGatewayEvent = {
            headers: {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            resource: '/{proxy+}',
            path: `/things/${mockedThingName}/certificates`,
            pathParameters: {
                'path':`/things/${mockedThingName}/certificates`
            },
            httpMethod: 'PATCH',
            multiValueQueryStringParameters: null,
            queryStringParameters: null,
            body: '{"certificateStatus":"ACTIVE"}'
        };

        const mockedInvokeCall = mockedInvokerService.invoke = jest.fn().mockImplementationOnce(() => {
            return {
                status: 204,
                header: {
                    'x-powered-by': 'Express',
                    'content-type': 'application/vnd.aws-cdf-v1.0+json; charset=utf-8',
                    'access-control-allow-origin': '*',
                    'content-length': '1542',
                    'etag': 'W/"606-M2s2z3plBvAsdzUVQPYbgBEcEDU"',
                    'date': 'Wed, 13 May 2020 20:31:15 GMT',
                    'connection': 'close'
                }
            };
        });

        await instance.updateThingCertificates(mockedThingName, mockedCertificateStatus);

        expect(mockedInvokeCall).toBeCalledTimes(1);
        expect(mockedInvokeCall.mock.calls[0][0]).toEqual(mockedFunctionName);
        expect(mockedInvokeCall.mock.calls[0][1]).toEqual(mockedLambdaApiGatewayEvent);

    });

});
