/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import AWS, { AWSError } from 'aws-sdk';
import { CertificateService } from './certificates.service';
import { RegistryManager } from '../registry/registry.interfaces';

let mockedRegistryManager: RegistryManager;
let mockedIot: AWS.Iot;
let mockedIotData: AWS.IotData;
let mockedS3: AWS.S3;
let mockedSSM: AWS.SSM;
const s3Bucket = 'myBucket';
const s3Prefix = 'certificates';
const s3Suffix = '';
const presignedUrlExpiresInSeconds = 60;
const mqttGetSuccessTopic = 'cdf/certificates/device123/get/accepted';
const mqttGetFailureTopic = 'cdf/certificates/device123/get/rejected';
const mqttAckSuccessTopic = 'cdf/certificates/device123/ack/accepted';
const mqttAckFailureTopic = 'cdf/certificates/device123/ack/rejected';
const thingGroupName = 'myTestGroup';
const caCertificateId = 'abcdef123456';
const rotateCertPolicy = 'UnitTestDevicePolicy';
const certificateExpiryDays = 100;
const deletePreviousCertificate = false;
const certId = 'cert123456';
let instance: CertificateService;

const deviceId = 'device123';

describe('CertificatesService', () => {

    beforeEach(() => {

        mockedRegistryManager = {
          isWhitelisted: jest.fn(_deviceId => Promise.resolve(true)),
          updateAssetStatus: jest.fn(_deviceId => null)
        };
        mockedS3 = new AWS.S3();
        mockedIot = new AWS.Iot();
        mockedIotData = new AWS.IotData({endpoint:'mocked'});
        mockedSSM = new AWS.SSM();

        const mockedS3Factory = () => {
            return mockedS3;
        };
        const mockedIotFactory = () => {
            return mockedIot;
        };
        const mockedIotDataFactory = () => {
            return mockedIotData;
        };
        const mockedSsmFactory = () => {
            return mockedSSM;
        };

        instance = new CertificateService(s3Bucket, s3Prefix, s3Suffix, presignedUrlExpiresInSeconds,
            mqttGetSuccessTopic, mqttGetFailureTopic, mqttAckSuccessTopic, mqttAckFailureTopic,
            thingGroupName, caCertificateId, rotateCertPolicy, certificateExpiryDays, deletePreviousCertificate,
            mockedRegistryManager, mockedIotFactory, mockedIotDataFactory, mockedS3Factory, mockedSsmFactory);
    });

    it('requesting certificate for non-whitelisted device returns error', async() => {

        // mocks
        // const mockedGetDeviceByID = mockedDevicesService.getDeviceByID.mockImplementationOnce(()=> undefined);
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(false));

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.error = null;
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockPublishResponse)
            };
        });

        // execute
        try {
            await instance.get(deviceId);
            fail('DEVICE_NOT_WHITELISTED error should be thrown');
        } catch (err) {
            expect(err.message).toEqual('DEVICE_NOT_WHITELISTED');
        }

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);
        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"message":"DEVICE_NOT_WHITELISTED"}`,
            qos: 1,
            topic: mqttGetFailureTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });

    it('requesting certificate resulting in missing certificate package returns error', async() => {

        // mocks
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(true));

        const mockHeadObjectResponse = new MockHeadObjectOutput();
        mockHeadObjectResponse.error = mockError({message:'Not Found'});
        const mockHeadObject = mockedS3.headObject = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.reject(mockHeadObjectResponse)
            };
        });

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.error = null;
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockPublishResponse)
            };
        });

        // execute
        try {
            await instance.get(deviceId);
        } catch (err) {
            expect(err.message).toEqual('CERTIFICATE_NOT_FOUND');
        }

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);
        const expectedHeadObject:AWS.S3.HeadObjectRequest = {
            Bucket: s3Bucket,
            Key: `${s3Prefix}${deviceId}${s3Suffix}`
        };
        expect(mockHeadObject).toBeCalledWith(expectedHeadObject);
        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"message":"CERTIFICATE_NOT_FOUND"}`,
            qos: 1,
            topic: mqttGetFailureTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });

    it('requesting certificate resulting in missing certificate id returns error', async() => {

        // mocks
        // const mockedGetDeviceByID = mockedDevicesService.getDeviceByID.mockImplementationOnce(()=> device);
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(true));

        const mockHeadObjectResponse = new MockHeadObjectOutput();
        mockHeadObjectResponse.response = {};
        mockHeadObjectResponse.error = null;
        const mockHeadObject = mockedS3.headObject = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockHeadObjectResponse)
            };
        });

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.error = null;
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockPublishResponse)
            };
        });

        // execute
        try {
            await instance.get(deviceId);
            fail('MISSING_CERTIFICATE_ID error should be thrown');
        } catch (err) {
            expect(err.message).toEqual('MISSING_CERTIFICATE_ID');
        }

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);
        const expectedHeadObject:AWS.S3.HeadObjectRequest = {
            Bucket: s3Bucket,
            Key: `${s3Prefix}${deviceId}${s3Suffix}`
        };
        expect(mockHeadObject).toBeCalledWith(expectedHeadObject);
        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"message":"MISSING_CERTIFICATE_ID"}`,
            qos: 1,
            topic: mqttGetFailureTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });

    it('requesting certificate returns success', async() => {

        // mocks
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(true));

        const certificateId = '1234567890';
        const mockHeadObject = mockedS3.headObject = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => {
                  return {Metadata:{certificateid: certificateId}};
              }
            };
        });

        const mockUpdateCert = mockedIot.updateCertificate = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () =>  new UpdateCertificateResponse()
            };
        });

        const presignedUrl = 'testUrl';
        const mockGetSignedUrl = mockedS3.getSignedUrl = jest.fn((_params) => presignedUrl);
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => new MockPublishResponse()
            };
        });

        // execute
        await instance.get(deviceId);

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);

        const expectedUpdateCert:AWS.Iot.UpdateCertificateRequest = {
            certificateId,
            newStatus: 'ACTIVE'
        };
        expect(mockUpdateCert).toBeCalledWith(expectedUpdateCert);

        const s3Key = `${s3Prefix}${deviceId}${s3Suffix}`;
        const expectedHeadObject:AWS.S3.HeadObjectRequest = {
            Bucket: s3Bucket,
            Key: s3Key
        };
        expect(mockHeadObject).toBeCalledWith(expectedHeadObject);

        const expectedGetSignedUrl = {
            Bucket: s3Bucket,
            Key: s3Key,
            Expires: presignedUrlExpiresInSeconds
        };
        expect(mockGetSignedUrl).toBeCalledWith('getObject', expectedGetSignedUrl);

        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"location":"${presignedUrl}"}`,
            qos: 1,
            topic: mqttGetSuccessTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });

    it('acknowledging certificate rotation for non-whitelisted device returns error', async() => {

        // mocks
        // const mockedGetDeviceByID = mockedDevicesService.getDeviceByID.mockImplementationOnce(()=> undefined);
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(false));

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.error = null;
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockPublishResponse)
            };
        });

        // execute
        try {
            await instance.ack(deviceId, certId);
            fail('DEVICE_NOT_WHITELISTED error should be thrown');
        } catch (err) {
            expect(err.message).toEqual('DEVICE_NOT_WHITELISTED');
        }

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);
        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"message":"DEVICE_NOT_WHITELISTED"}`,
            qos: 1,
            topic: mqttAckFailureTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });

    it('acknowledging certificate rotation returns success', async() => {

        // mocks
        // const mockedGetDeviceByID = mockedDevicesService.getDeviceByID.mockImplementationOnce(()=> device);
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(true));

        const mockRemoveThingFromThingGroupResponse = new RemoveThingFromThingGroupResponse();
        mockRemoveThingFromThingGroupResponse.response = {};
        mockRemoveThingFromThingGroupResponse.error = null;
        const mockRemoveThingFromThingGroup = mockedIot.removeThingFromThingGroup = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockRemoveThingFromThingGroupResponse)
            };
        });

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.error = null;
        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve(mockPublishResponse)
            };
        });

        // execute
        await instance.ack(deviceId, certId);

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);

        const expectedRemoveThingFromThingGroup:AWS.Iot.Types.RemoveThingFromThingGroupRequest = {
            thingName: deviceId,
            thingGroupName
        };
        expect(mockRemoveThingFromThingGroup).toBeCalledWith(expectedRemoveThingFromThingGroup);

        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"message":"OK"}`,
            qos: 1,
            topic: mqttAckSuccessTopic
        };
        expect(mockedPublish).toBeCalledWith(expectedPublish);

    });
});

const mockError = (overrides:any) => {
    const error:AWSError = {code:'', message:'', retryable:false, statusCode:0, time:new Date(), hostname:'',
    region:'', retryDelay:0, requestId:'', extendedRequestId:'', cfId:'', name:''};
    return {...error, ...overrides};
};

class MockHeadObjectOutput {
    public response: AWS.S3.HeadObjectOutput;
    public error: AWSError;

    promise(): Promise<AWS.S3.HeadObjectOutput> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

class UpdateCertificateResponse {
    public response: void;
    public error: AWSError;

    promise(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

class RemoveThingFromThingGroupResponse {
    public response: AWS.Iot.RemoveThingFromThingGroupResponse;
    public error: AWSError;

    promise(): Promise<AWS.Iot.RemoveThingFromThingGroupResponse> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

class MockPublishResponse {
    public response: void;
    public error: AWSError;

    promise(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
