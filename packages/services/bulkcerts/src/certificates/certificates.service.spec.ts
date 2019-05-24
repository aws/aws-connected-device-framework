/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { logger } from '../utils/logger';
import { CertificatesService } from './certificates.service';
import AWS, { AWSError } from 'aws-sdk';
import { CertificatesTaskDao } from './certificatestask.dao';
import { CertificateChunkRequest } from './certificates.models';

describe('CertificatesService', () => {
    let mockedCertificatesTaskDao: jest.Mocked<CertificatesTaskDao>;
    let instance: CertificatesService;

    let mockS3: AWS.S3;
    let mockIot: AWS.Iot;
    let mockSsm: AWS.SSM;

    beforeEach(() => {
        mockS3 = new AWS.S3();
        mockIot = new AWS.Iot();
        mockSsm = new AWS.SSM();
        mockedCertificatesTaskDao = createMockInstance(CertificatesTaskDao);

        const mockS3Factory = () => {
            return mockS3;
        };
        const mockIotFactory = () => {
            return mockIot;
        };
        const mockSsmFactory = () => {
            return mockSsm;
        };

        instance = new CertificatesService( mockedCertificatesTaskDao, mockIotFactory, mockS3Factory, mockSsmFactory, 'unit-test-bucket', 'certs/', 365);
    });

    it('createBatch should create batch with customer CA', async () => {

        jest.setTimeout(15000);

        const mockUpload = mockS3.upload = <any>(jest.fn((_params, cb) => {
            cb(null, 'pass');
        }));

        // fake CA PEM
        const describeCaCertResponse:AWS.Iot.Types.DescribeCACertificateResponse = {
            certificateDescription: {
                certificateArn:'arn:aws:iot:us-west-2:157731826412:cacert/3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32',
                certificateId:'3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32',
                status:'ACTIVE',
                certificatePem:'-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n',
                ownedBy:'157731826412',
                creationDate: new Date('2018-06-19T20:20:08.947Z'),
                autoRegistrationStatus:'DISABLE',
                lastModifiedDate: new Date('2018-06-19T20:21:00.198Z'),
                customerVersion:2,
                generationId:'a2e00480-723f-428e-b3cb-c592f79dcc6c'
            }
        };

        const mockDescribeCaCertResponse = new MockDescribeCaCertResponse();
        mockDescribeCaCertResponse.error = null;
        mockDescribeCaCertResponse.response = describeCaCertResponse;
        const mockDescribeCaCert = mockIot.describeCACertificate = <any>(jest.fn((_params) => mockDescribeCaCertResponse));

        // fake private key
        const getParameterResponse = {
            Parameter: {
                Name: 'cdf-ca-key-3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32',
                Type: 'SecureString',
                Value: '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAotL+0aJBQeqQrheuC+DeO22cQvnXbvIHCIjBHaes/NEYbz6u\nMO2UiaCI6Ukeni5NvGWkFknDvbJcHeCoxcbyOCy7aoMMSUnF7X/FhqUE4IGH489g\nDs8X4yW4qw+8X58abC3zP1V4xduRM90AIMetqG3UA/LOdXONpekmBoNgtLc03GeI\nnekjsYoBLIgRUejmzWKxR3AZC1X07BvUFkkoyVNjhhcnUtoCwqEI261pAPgaRFYG\ndLn4Hs1QyV6gpO2qy7neGCDPQZ5HDoc3YGHEs/3zEbJu5NNsfq5wTdKPRrX5ctZx\nuorYi5/SwFMZIcNlCURUIRcI0wAwvcEFVdtFbQIDAQABAoIBAHZ/uJQ40eV3IPSS\np0hdz17Q1vine/JykkvTuzgp3+vfATl1FLDnN0MyYnHllTLp4AlMr67I4HweYowc\nBLhrobzgUUWjOj3cQwAmDUuArZv2qT9SnUYp0eiue0eDnES7Ni+lAXMGcW8N7Q8h\nuAYjTG9X/wUgoME558zncZUr6CWcRnXlzbeBCiZp1zGvnToSlyHQ8ep9E825x5ta\nQHltgXkjrr0Y+6FedE298h8lIcQbHiVATEHBjRfj5WCitg6u8YqrxqUZX9WcZzMG\n2iIq6V9VcZ1tacYnx9j9GNxsNQmyBzpqH+/uKll+JOnXuMn9NZT96jmO4Z84xS63\nKSDKVMECgYEA1zhrsqDUX9gmMG9tgsWHRnonblgbwlLPcjQqojlFm4KI8orWovWg\n+9PbsXe+1Tc0pM+6Rf24+skVSp+2FfG+yMQHqAVDUEp6jJKUzf0p74Gp15g9HRg/\ntkd2/sDmBXrCwiH9DDdVkcsmfweZM0EE6tf+Nu4dxEHcmDjVUhC5zXMCgYEAwa0F\nWU8vuLsjw4mgcfwxyUPQ7OkQ2TI59yP3OoRmQI1wqEg+EM3A8LX+c1DqBVqntVie\n69JjlTNy0lq8meSJI4C2J45FS4fG6YxGKD6FfWAFhkpRIGaL6F0l1Cwc9xYyKLxc\nN8WZ9Ia4BqWX9ltuLzW4gbiiur6DJ0r5JBHt6Z8CgYAZrV6UCkIsSTKNNs4e+wgf\nrXVE4fg14AFmA7lOb3zRh+pk3ZGsEZgqU2Vzr/CxqYt7WllD/nhyW0lSBOoJhjUX\n6ONs9WvJiYlDej2Msfat349u7HfmH72CNtaIoGURJEtWNA3nxjZMVat7HmH1zn0S\ns8Bdt10PzDfQZX918g7o5wKBgESR4HntOkUaJKBfQqn4kxvh4b9vCOMNEE66shZK\nt/UU3pUF9st2PWA73xmuxRweK5BeDu4JL+6sJ3PoYivOKOuj71nz2f7S1I7tdg1b\njWGFNI+GElD5XYFoMTN8ZsjoV9vqTHAGiupzJAZebH3xgwI979QlrZ+WQdMQjULD\nAkubAoGAGQxGfmWsm4CjZpE2UUikj4lq9PVo25NquJOKKeCEZnEJlELaUo8hX0us\ncW3aPb3MUVQBJCQeqUBDWudWH1bGy4mQZG9zQrLPz9swqF0O1Sr6Sxa1Sot/YU88\n1yLMn9MCu49J2tRNB7Mcs5vImB9v3Pm/zJJ+IvUndiOltycVHu8=\n-----END RSA PRIVATE KEY-----\n',
                Version: 1
            }
        };

        const mockGetParameterResponse = new MockGetParameterResponse();
        mockGetParameterResponse.error = null;
        mockGetParameterResponse.response = getParameterResponse;
        const mockGetParameter = mockSsm.getParameter = <any>(jest.fn((_params) => mockGetParameterResponse));

        const chunkRequest:CertificateChunkRequest = {
            certInfo:{
                commonName: 'unittest.org',
                organization: 'test',
                organizationalUnit: 'QA',
                locality: 'Testtown',
                stateName: 'CA',
                country: 'US',
                emailAddress: 'info@unittest.org',
                id: 'testid'
            },
            caAlias: 'test-customerca',
            taskId: '123',
            chunkId: 456,
            quantity: 4
        };

        await instance.createChunk(chunkRequest);

        expect(mockUpload).toBeCalled();
        expect(mockDescribeCaCert).toBeCalledWith({certificateId: '3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32'});
        expect(mockGetParameter).toBeCalledWith({Name: `cdf-ca-key-3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32`,WithDecryption: true});
    });

    it('createBatch should create batch with AWS IoT CA', async () => {

        jest.setTimeout(15000);

        const mockUpload = mockS3.upload = <any>(jest.fn((_params, cb) => {
            cb(null, 'pass');
        }));

        const createCertFromCsrResponse:AWS.Iot.CreateCertificateFromCsrResponse = {
            certificateArn:'arn:aws:iot:us-west-2:157731826412:cacert/3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32',
            certificateId:'3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32',
            certificatePem:'-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n',
        };

        const mockCreateCertFromCsrResponse = new MockCreateCertFromCsrResponse();
        mockCreateCertFromCsrResponse.error = null;
        mockCreateCertFromCsrResponse.response = createCertFromCsrResponse;
        const mockCreateCertFromCsr = mockIot.createCertificateFromCsr = <any>(jest.fn((_params) => mockCreateCertFromCsrResponse));

        const chunkRequest:CertificateChunkRequest = {
            certInfo:{
                commonName: 'unittest.org',
                organization: 'test',
                organizationalUnit: 'QA',
                locality: 'Testtown',
                stateName: 'CA',
                country: 'US',
                emailAddress: 'info@unittest.org',
                id: 'testid'
            },
            caAlias: 'test-iotca',
            taskId: '123',
            chunkId: 456,
            quantity: 4
        };

        await instance.createChunk(chunkRequest);

        expect(mockUpload).toBeCalled();
        expect(mockCreateCertFromCsr).toBeCalledTimes(4);
    });

    it('createBatch should throw error for invalid parameter', async () => {

        try {
            const createBatchParameters = {
                quantity: 0,
                taskId: 'a',
                chunkId: 1,
                certInfo: {},
                caAlias: 'alias'
            };
            const createResponse = await instance.createChunk(createBatchParameters);
            logger.debug(`createResponse: ${JSON.stringify(createResponse)}`);
            fail(); // expecting error
        } catch (e) {
            expect(e.name).toEqual('ArgumentError');
        }
    });

    it('deleteBatch should delete batch for valid id', async () => {
        // first delete lists objects in the bucket with the bulk id prefix, so mock this (return zip)
        const listObjectsV2Data:AWS.S3.Types.ListObjectsV2Output = {
            IsTruncated:false,
            Contents: [
                {
                    Key:'testBatchId/certs.zip',
                    LastModified: new Date('2018-08-07T16:22:39.000Z'),
                    ETag:'\"ddc5b279ffe980efe2506025cc5fb889\"',
                    Size:327714,
                    StorageClass:'STANDARD'
                }
            ],
            Name:'unit-test-delete-certs-bucket',
            Prefix:'testBatchId',
            MaxKeys:1000,
            CommonPrefixes:[] as any,
            KeyCount:2
        };

        const mockListObjectsV2Response = new MockListObjectsV2Response();
        mockListObjectsV2Response.error = null;
        mockListObjectsV2Response.response = listObjectsV2Data;
        const mockListObjectsV2 = mockS3.listObjectsV2 = <any>(jest.fn((_params) => mockListObjectsV2Response));

        // then delete issue a request to delete the objects
        const deleteObjectsData = {
            Deleted: [
                {Key: 'testBatchId/certs.zip'}
            ],
            Errors:[] as any
        };

        const mockDeleteObjectsResponse = new MockDeleteObjectsResponse();
        mockDeleteObjectsResponse.error = null;
        mockDeleteObjectsResponse.response = deleteObjectsData;
        const mockDeleteObjects = mockS3.deleteObjects = <any>(jest.fn((_params) => mockDeleteObjectsResponse));

        // now do the delete call
        const deletedResponse = await instance.deleteBatch('testBatchId');

        // validation
        expect(deletedResponse).toBeTruthy();
        expect(mockListObjectsV2).toBeCalledWith({Bucket: 'unit-test-bucket', Prefix: 'certs/testBatchId'});
        expect(mockDeleteObjects).toBeCalledWith({Bucket: 'unit-test-bucket', Delete: { Objects: [{'Key': 'testBatchId/certs.zip'}]}});
    });

    it('deleteBatch should throw error for non-existent batch', async () => {
        // delete does a list in bucket first, so mock that as an error
        const mockListObjectsV2Response = new MockListObjectsV2Response();
        mockListObjectsV2Response.error = {
            name: 'NoSuchKeyError',
            code: 'NoSuchKey',
            message: 'Object does not exist',
            retryable: false,
            statusCode: 404,
            time: new Date('2018-08-07T16:22:39.000Z'),
            hostname: 'unittest.s3.amazonaws.com',
            region: 'us-west-2',
            retryDelay: 2000,
            requestId: 'unit-test-request-id',
            extendedRequestId: 'even-longer-unit-test-id',
            cfId: 'unit-test-cf-id'
        };
        mockListObjectsV2Response.response = null;
        const mockListObjectsV2 = mockS3.listObjectsV2 = <any>(jest.fn((_params) => mockListObjectsV2Response));

        try {
            const s3Manifest = await instance.deleteBatch('testBatchId');
            logger.debug(`s3Manifest: ${JSON.stringify(s3Manifest)}`);
            fail(); // expecting error
        } catch (e) {
            expect(e.message).toEqual('Object does not exist');
        }

        // validation
        expect(mockListObjectsV2).toBeCalledWith({Bucket: 'unit-test-bucket', Prefix: 'certs/testBatchId'});
    });
});

class MockListObjectsV2Response {
    public response: AWS.S3.Types.ListObjectsV2Output;
    public error: AWSError;

    promise(): Promise<AWS.S3.Types.ListObjectsV2Output> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
class MockDeleteObjectsResponse {
    public response: AWS.S3.Types.DeleteObjectsOutput;
    public error: AWSError;

    promise(): Promise<AWS.S3.Types.DeleteObjectsOutput> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

// IoT

class MockCreateCertFromCsrResponse {
    public response: AWS.Iot.Types.CreateCertificateFromCsrResponse;
    public error: AWSError;

    promise(): Promise<AWS.Iot.Types.CreateCertificateFromCsrResponse> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
class MockDescribeCaCertResponse {
    public response: AWS.Iot.Types.DescribeCACertificateResponse;
    public error: AWSError;

    promise(): Promise<AWS.Iot.Types.DescribeCACertificateResponse> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

// SSM

class MockGetParameterResponse {
    public response: AWS.SSM.Types.GetParameterResult;
    public error: AWSError;

    promise(): Promise<AWS.SSM.Types.GetParameterResult> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
