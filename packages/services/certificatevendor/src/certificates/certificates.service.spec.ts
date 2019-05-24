/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
const deviceCsr = '-----BEGIN CERTIFICATE REQUEST-----\nMIICrzCCAZcCAQAwajELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMREwDwYDVQQH\nDAhNb3JyaXNvbjERMA8GA1UECgwIUmVkUm9ja3MxETAPBgNVBAsMCENvbmNlcnRz\nMRUwEwYDVQQDDAxBQkNERUZHMTIzNDUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw\nggEKAoIBAQDtE7E3LnSLzFxFds9a7gzhOxqu262DrECCJ6E53rkZUyL+JroJeq0c\nNKaCujgCroD/ai3n9ms4rDBT73JvX3B5jXMAdQNdNxyvQgLzofTN2PjCUeDlpZEG\ntAKajuu2a5PqereZhCBBaJ/wf3yQEuBX0we6hioqiwKqHC2nEDoOY7yyf/IVsgFT\nVfodbdiGH7dUre6r/77RfKQQr4sEyUkknN+csrCOkfh1/tZWxMdUR1if3aTVhVmq\nWgik3cHF2SMs4Au7wji5CvyF27OLVFZ20uQ6UzLzTwc+PQfQLK2WSyQ4TuRYFsLP\nT1zr2TbjPNhqSKDZuca/l06TvJC9VbRfAgMBAAGgADANBgkqhkiG9w0BAQsFAAOC\nAQEAllcm8mzXgvlsVW6bhs0ioFuF9C3jA+WLqnSN/8Qe+TQckPzwNhbsMtrCn47W\nupS9b+6no/YtYHL5dzFq8gsKhR3dJx61qsW+NS91TU4Hn2dVIrzDmaphQrEa6oVn\nTk/596Nlg/k18HQxP47HzM4vn2Jfk5nDz+j1gUMSgnAq0bYPO/aMu5RoVbMNlkII\ntYwdk8wOmY1SVAveNp9Cxox4aO3vCx2oxMLc4xDg2QDKKl+46Om1f1R6ZZ8pJwEG\nNSY9fu36JhFcJ6/9CiIcl4KhNPTmpibJtRqQOzQBK9KuzPbIoBlfDPGDlIq/R/to\n9GNPPZHz9yJ6VXqJjsCa1PEL/g==\n-----END CERTIFICATE REQUEST-----\n';
const caPem = '-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n';
const caKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAotL+0aJBQeqQrheuC+DeO22cQvnXbvIHCIjBHaes/NEYbz6u\nMO2UiaCI6Ukeni5NvGWkFknDvbJcHeCoxcbyOCy7aoMMSUnF7X/FhqUE4IGH489g\nDs8X4yW4qw+8X58abC3zP1V4xduRM90AIMetqG3UA/LOdXONpekmBoNgtLc03GeI\nnekjsYoBLIgRUejmzWKxR3AZC1X07BvUFkkoyVNjhhcnUtoCwqEI261pAPgaRFYG\ndLn4Hs1QyV6gpO2qy7neGCDPQZ5HDoc3YGHEs/3zEbJu5NNsfq5wTdKPRrX5ctZx\nuorYi5/SwFMZIcNlCURUIRcI0wAwvcEFVdtFbQIDAQABAoIBAHZ/uJQ40eV3IPSS\np0hdz17Q1vine/JykkvTuzgp3+vfATl1FLDnN0MyYnHllTLp4AlMr67I4HweYowc\nBLhrobzgUUWjOj3cQwAmDUuArZv2qT9SnUYp0eiue0eDnES7Ni+lAXMGcW8N7Q8h\nuAYjTG9X/wUgoME558zncZUr6CWcRnXlzbeBCiZp1zGvnToSlyHQ8ep9E825x5ta\nQHltgXkjrr0Y+6FedE298h8lIcQbHiVATEHBjRfj5WCitg6u8YqrxqUZX9WcZzMG\n2iIq6V9VcZ1tacYnx9j9GNxsNQmyBzpqH+/uKll+JOnXuMn9NZT96jmO4Z84xS63\nKSDKVMECgYEA1zhrsqDUX9gmMG9tgsWHRnonblgbwlLPcjQqojlFm4KI8orWovWg\n+9PbsXe+1Tc0pM+6Rf24+skVSp+2FfG+yMQHqAVDUEp6jJKUzf0p74Gp15g9HRg/\ntkd2/sDmBXrCwiH9DDdVkcsmfweZM0EE6tf+Nu4dxEHcmDjVUhC5zXMCgYEAwa0F\nWU8vuLsjw4mgcfwxyUPQ7OkQ2TI59yP3OoRmQI1wqEg+EM3A8LX+c1DqBVqntVie\n69JjlTNy0lq8meSJI4C2J45FS4fG6YxGKD6FfWAFhkpRIGaL6F0l1Cwc9xYyKLxc\nN8WZ9Ia4BqWX9ltuLzW4gbiiur6DJ0r5JBHt6Z8CgYAZrV6UCkIsSTKNNs4e+wgf\nrXVE4fg14AFmA7lOb3zRh+pk3ZGsEZgqU2Vzr/CxqYt7WllD/nhyW0lSBOoJhjUX\n6ONs9WvJiYlDej2Msfat349u7HfmH72CNtaIoGURJEtWNA3nxjZMVat7HmH1zn0S\ns8Bdt10PzDfQZX918g7o5wKBgESR4HntOkUaJKBfQqn4kxvh4b9vCOMNEE66shZK\nt/UU3pUF9st2PWA73xmuxRweK5BeDu4JL+6sJ3PoYivOKOuj71nz2f7S1I7tdg1b\njWGFNI+GElD5XYFoMTN8ZsjoV9vqTHAGiupzJAZebH3xgwI979QlrZ+WQdMQjULD\nAkubAoGAGQxGfmWsm4CjZpE2UUikj4lq9PVo25NquJOKKeCEZnEJlELaUo8hX0us\ncW3aPb3MUVQBJCQeqUBDWudWH1bGy4mQZG9zQrLPz9swqF0O1Sr6Sxa1Sot/YU88\n1yLMn9MCu49J2tRNB7Mcs5vImB9v3Pm/zJJ+IvUndiOltycVHu8=\n-----END RSA PRIVATE KEY-----\n';

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

    it('requesting certificate with CSR for non-whitelisted device returns error', async() => {

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
            await instance.getWithCsr(deviceId, deviceCsr);
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

    it('requesting certificate with CSR returns success', async() => {

        // mocks
        const mockedIsWhitelisted = mockedRegistryManager.isWhitelisted = jest.fn(_deviceId => Promise.resolve(true));

        const caCert = {
            certificateDescription: {
                certificateArn: `arn:aws:iot:us-west-2:1234567890:cacert/${caCertificateId}`,
                certificateId: caCertificateId,
                status: 'ACTIVE',
                certificatePem: caPem,
                ownedBy: '1234567890',
                autoRegistrationStatus: 'ENABLE',
                customerVersion: 2,
                generationId: caCertificateId
            }
        };
        const mockedDescribeCaCertificate = mockedIot.describeCACertificate = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => caCert
            };
        });

        const ssmParam = {
            Parameter: {
                Name: `cdf-ca-key-${caCertificateId}`,
                Type: 'SecureString',
                Value: caKey,
                Version: 1
            }
        };
        const mockedGetParameter = mockedSSM.getParameter = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => ssmParam
            };
        });

        const registerCert = {
            certificateArn: 'arn:aws:iot:us-west-2:1234567890:cert/aa889ee7a74458d6ef4595c50be546982c6cf30d29c32481556639723cf550ce',
            certificateId: 'aa889ee7a74458d6ef4595c50be546982c6cf30d29c32481556639723cf550ce'
        };
        let registerParams = {caCertificatePem:'',certificatePem:''};
        const mockedRegisterCert = mockedIot.registerCertificate = jest.fn().mockImplementationOnce((params)=> {
            registerParams = params;
            return {
              promise: () => registerCert
            };
        });

        const attachThingPrincipal = {};
        const mockedAttachThingPrincipal = mockedIot.attachThingPrincipal = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => attachThingPrincipal
            };
        });

        const attachPrincipalPolicy = {};
        const mockedAttachPrincipalPolicy = mockedIot.attachPrincipalPolicy = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => attachPrincipalPolicy
            };
        });

        const mockedPublish = mockedIotData.publish = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => new MockPublishResponse()
            };
        });

        // execute
        await instance.getWithCsr(deviceId, deviceCsr);

        // verify mocks were called correctly
        expect(mockedIsWhitelisted).toBeCalledWith(deviceId);
        expect(mockedDescribeCaCertificate).toBeCalledWith({certificateId:caCertificateId});
        expect(mockedGetParameter).toBeCalledWith({Name:`cdf-ca-key-${caCertificateId}`,WithDecryption:true});
        expect(mockedRegisterCert).toBeCalled();
        expect(mockedAttachThingPrincipal).toBeCalledWith({principal:'arn:aws:iot:us-west-2:1234567890:cert/aa889ee7a74458d6ef4595c50be546982c6cf30d29c32481556639723cf550ce',thingName:deviceId});
        expect(mockedAttachPrincipalPolicy).toBeCalledWith({principal:'arn:aws:iot:us-west-2:1234567890:cert/aa889ee7a74458d6ef4595c50be546982c6cf30d29c32481556639723cf550ce',policyName:rotateCertPolicy});

        const publishedCert = registerParams.certificatePem.replace(/\n/g, '\\n');
        const expectedPublish:AWS.IotData.Types.PublishRequest = {
            payload: `{"certificate":"${publishedCert}"}`,
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
