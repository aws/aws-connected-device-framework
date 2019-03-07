/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { logger } from '../utils/logger';
import { ThingsService } from './things.service';
import { ClientIdEnforcementPolicyStepProcessor } from './steps/clientidenforcementpolicystepprocessor';
import { CreateDeviceCertificateStepProcessor } from './steps/createdevicecertificateprocessor';

// tslint:disable-next-line:no-var-requires
const AWSMock = require('aws-sdk-mock');
import AWS from 'aws-sdk';
AWSMock.setSDKInstance(AWS);
AWS.config.update({ region: 'us-xxxx-1' });

let instance: ThingsService;
let mockedIot: AWS.Iot;
let mockedS3: AWS.S3;
let mockedClientIdEnforcementPolicyStepProcessor: ClientIdEnforcementPolicyStepProcessor;
let mockedCreateDeviceCertificateStepProcessor: CreateDeviceCertificateStepProcessor;

describe('ThingsService', () => {

    beforeEach(() => {

        mockedClientIdEnforcementPolicyStepProcessor = createMockInstance(ClientIdEnforcementPolicyStepProcessor);
        mockedCreateDeviceCertificateStepProcessor = createMockInstance(CreateDeviceCertificateStepProcessor);
        const mockedIotFactory = () => {
            return mockedIot;
        };
        const mockedS3actory = () => {
            return mockedS3;
        };

        instance = new ThingsService(mockedIotFactory, mockedS3actory, mockedClientIdEnforcementPolicyStepProcessor,
            mockedCreateDeviceCertificateStepProcessor, 's3RoleArn', 'templateBucketName', 'templatePrefix',
            'templateSuffix', 'bulkrequestsBucketName', 'bulkrequestsPrefix', false, false);
    });

    // aws-sdk-mock mocks cannot be made within an async method, therefore must mock the call OUTSIDE the test method
    const testProvisioningTemplate = {
        Parameters: {
            ThingName: {
                Type: 'String'
            }
        },
        Resources: {
            thing: {
                Type: 'AWS::IoT::Thing',
                Properties: {
                    ThingName: {
                        Ref: 'ThingName'
                    }
                }
            }
        }
    };
    AWSMock.mock('S3', 'getObject', (_params:AWS.S3.Types.GetObjectRequest, callback?: (err: AWS.AWSError, data: AWS.S3.Types.GetObjectOutput) => void) => {
        const s3BodyBuffer = new Buffer(JSON.stringify(testProvisioningTemplate));
        callback(null, {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {}
        });
    });
    mockedS3 = new AWS.S3();

    const certPem = '-----BEGIN CERTIFICATE-----\nMIIDWTCCAkGgAwIBAgIUaZcev4S7X+MOR4YZZ14B9kGyTLQwDQYJKoZIhvcNAQEL\nBQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g\nSW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTE2MTAwNjA1NTky\nOFoXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0\nZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAI42N3WdyZSoB/cbcamp\nHk8/Jw2++d7IjEIwzx2dX7XUNygYcHfv8HY7IAaCTuR/9F4GfUvSb9JOr+BpE1Rb\nsBVcWCYUuPPs2isdnOWCRPjEdGHFtynHwKFlxYyHCQzeUaHpaFyMsdcuX5huWWX4\nO46iSpW68fEEbaGRW6gLQyJIWHfGTgMLi+E92ObaeD+d5EDFDXAxgsMjh+zW8otx\nuebir1AHVBqKvpySPbZcANXVSz2TG+zAYK388VLMciLjof0RVDnKIiXankqE0d8Q\nyp+IpTtS0eKj+CdmhZsqsvATasbzU/s6FyVZ5Az64E14ioatIxfnPcij2eSo8WBE\n4EECAwEAAaNgMF4wHwYDVR0jBBgwFoAU5NFd/c659dOdGoJ4KqHz7YFnGc8wHQYD\nVR0OBBYEFCsrwAPHUQnh/RsmNgEciJbdBEcJMAwGA1UdEwEB/wQCMAAwDgYDVR0P\nAQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQB2Cdv7iMXuF38QkDOx7giIwtnG\nYGZKDmE1siGr/zx8RkXlsxriFwxexSIUvVTxVyeyOL0Pf58AcOYAfAiGpbT5Vmai\nxu3XK1f67ba9cJn7l1eZYgZOKKioMRbIg/3vyxh/fNolVXuVP0QxHhJfxmP88BH5\nNuYhnz3WNtZOb1wRVgwxTcVt6T09y6/XTBvB8gB6B98ZBnLTeF3+eVF9Tx6oUPR9\nNjubfMMr5aN0SIkmEpVyVZSce133ClVja4JAV5WmrRhw9e15vD7F1Hfq5wyExNOo\nYQhQVBFuRdRdsYJoZG6MeWi0MdW5C5HxdZsbLak0+SMGojtGuiJwfxtNt5Q0\n-----END CERTIFICATE-----\n';
    const arns = {
        PolicyLogicalName: 'arn:aws:iot:us-west-2:1234567890:policy/UnitTestPolicy',
        certificate: 'arn:aws:iot:us-west-2:1234567890:certificate/testcertid',
        thing: 'arn:aws:iot:us-west-2:1234567890:thing/UnitTestThingName'
    };
    AWSMock.mock('Iot', 'registerThing', (_params:AWS.Iot.Types.RegisterThingRequest, callback?: (err: AWS.AWSError, data: AWS.Iot.Types.RegisterThingResponse) => void) => {
        const registerThingResponse = {
            certificatePem: certPem,
            resourceArns: arns
        };
        callback(null, registerThingResponse);
    });

    AWSMock.mock('Iot', 'listThingPrincipals', (_params:AWS.Iot.Types.ListThingPrincipalsRequest, callback?: (err: AWS.AWSError, data: AWS.Iot.Types.ListThingPrincipalsResponse) => void) => {
        console.log('****************************************   CALLED   ************************************************');
        callback(null, {
            principals: []
        });
    });

    let deleteThingCalled=0;
    AWSMock.mock('Iot', 'deleteThing', (_params:AWS.Iot.Types.DeleteThingRequest, callback?: (err: AWS.AWSError, data: AWS.Iot.Types.DeleteThingResponse) => void) => {
        deleteThingCalled++;
        callback(null, {});
    });

    let deleteCertificate=0;
    AWSMock.mock('Iot', 'deleteCertificate', (_params:AWS.Iot.Types.DeleteCertificateRequest, callback?: (err: AWS.AWSError, data: {}) => void) => {
        deleteCertificate++;
        callback(null, {});
    });

    mockedIot = new AWS.Iot();

    it('provision should provision thing', async () => {

        // now do the service call
        const provisionResponse = await instance.provision('test_template_id', {ThingName: 'UnitTestThingName'}, {});
        logger.debug(`provisionResponse: ${JSON.stringify(provisionResponse)}`);

        expect(provisionResponse).toBeDefined();
        expect(provisionResponse.certificatePem).toEqual(certPem);
        expect(provisionResponse.resourceArns.certificate).toEqual(arns.certificate);
        expect(provisionResponse.resourceArns.thing).toEqual(arns.thing);
        expect(provisionResponse.resourceArns.policyLogicalName).toEqual(arns.PolicyLogicalName);
    });

    it('should delete thing without cert or policy', async () => {

        // now do the service call
        const testDeleteThingResponse = await instance.deleteThing('unitTestThing');
        logger.debug(`testDeleteThingResponse: ${JSON.stringify(testDeleteThingResponse)}`);

        expect(deleteThingCalled).toEqual(1);

        expect(deleteCertificate).toEqual(0);
    });
});
