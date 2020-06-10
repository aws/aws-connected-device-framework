/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import AWS, { AWSError } from 'aws-sdk';
import { ActivationService } from './activation.service';
import { DevicesService, PoliciesService } from '@cdf/assetlibrary-client';
import { ThingsService } from '@cdf/provisioning-client';
import { mock } from 'jest-mock-extended';

let mockedIot: AWS.Iot;
let mockedS3: AWS.S3;
let mockedDevicesService: jest.Mocked<DevicesService>;
let mockedPoliciesService: jest.Mocked<PoliciesService>;
let mockedThingsService: jest.Mocked<ThingsService>;
const crlBucket = 'myBucket';
const crlKey = 'crl/crl.json';

let instance: ActivationService;

describe('ActivationService', () => {

    beforeEach(() => {
        mockedS3 = new AWS.S3();
        mockedIot = new AWS.Iot();

        mockedDevicesService = mock<DevicesService>();
        mockedPoliciesService = mock<PoliciesService>();
        mockedThingsService = mock<ThingsService>();

        const mockedS3Factory = () => {
            return mockedS3;
        };
        const mockedIotFactory = () => {
            return mockedIot;
        };

        instance = new ActivationService(crlBucket, crlKey,
                                         mockedIotFactory, mockedS3Factory,
                                         mockedDevicesService, mockedPoliciesService, mockedThingsService);
    });

    it('activation service does not activate if cert in CRL', async() => {

        // Mocks ------------------------------------------------------
        const crl = { 'revokedCertificates': [
                { 'certificateId': 'revoked-cert-1', 'revokedOn': 1551796535, 'revokedReason': 1 },
                { 'certificateId': 'revoked-cert-2', 'revokedOn': 1551796535, 'revokedReason': 1 }
            ], 'lastUpdate': 1551796535
        };

        const s3BodyBuffer = new Buffer(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {}
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = mockedS3.getObject = <any>(jest.fn((_params) => mockGetObjectResponse));

        const mockUpdateCertResponse = new UpdateCertificateResponse();
        mockUpdateCertResponse.error = null;
        const mockUpdateCert = mockedIot.updateCertificate = <any>(jest.fn((_params) => mockUpdateCertResponse));

        // Test -------------------------------------------------------

        const testJitrEvent = {
            'certificateId': 'revoked-cert-2',
            'caCertificateId': '3f8837752188827',
            'timestamp': 1552061705285,
            'certificateStatus': 'PENDING_ACTIVATION',
            'awsAccountId': '157731826412',
            'certificateRegistrationTimestamp': '1552061705277'
        };

        await instance.activate(testJitrEvent);

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({Bucket: crlBucket, Key: crlKey});
        expect(mockUpdateCert).toBeCalledWith({certificateId: 'revoked-cert-2', newStatus:'REVOKED'});
    });

    it('activation service does not activate if device already in AssetLibrary', async() => {

        // Mocks ------------------------------------------------------

        const crl = { 'revokedCertificates': [
                { 'certificateId': 'revoked-cert-1', 'revokedOn': 1551796535, 'revokedReason': 1 },
                { 'certificateId': 'revoked-cert-2', 'revokedOn': 1551796535, 'revokedReason': 1 }
            ], 'lastUpdate': 1551796535
        };

        const s3BodyBuffer = new Buffer(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {}
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = mockedS3.getObject = <any>(jest.fn((_params) => mockGetObjectResponse));

        // cert pem has tempate ID and device ID in CN field: edge::TestCdfDevice001
        const certResponse:AWS.Iot.DescribeCertificateResponse = {
            certificateDescription: {
              certificateArn: 'arn:aws:iot:us-west-2:157731826412:cert/test-cert-1',
              certificateId: 'test-cert-1',
              status: 'PENDING_ACTIVATION',
              certificatePem: '-----BEGIN CERTIFICATE-----\nMIID5zCCAs8CCQCjfu9BRlYl1TANBgkqhkiG9w0BAQsFADCBsjELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAldBMRAwDgYDVQQHEwdTZWF0dGxlMR0wGwYDVQQKExRBV1Mg\nUHJvU2VydmUgSW9UIEdTUDEMMAoGA1UECxMDQ0RGMSUwIwYDVQQDExxjb25uZWN0\nZWRkZXZpY2VmcmFtZXdvcmsuY29tMTAwLgYJKoZIhvcNAQkBFiFpbmZvQGNvbm5l\nY3RlZGRldmljZWZyYW1ld29yay5jb20wHhcNMTkwMzE5MTcxMzI2WhcNMjAwNzMx\nMTcxMzI2WjCBtzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQHDAdT\nZWF0dGxlMREwDwYDVQQKDAhQcm9TZXJ2ZTEjMCEGA1UECwwaQ29ubmVjdGVkIERl\ndmljZSBGcmFtZXdvcmsxHzAdBgNVBAMMFmVkZ2U6OlRlc3RDZGZEZXZpY2UwMDEx\nMDAuBgkqhkiG9w0BCQEWIWluZm9AY29ubmVjdGVkZGV2aWNlZnJhbWV3b3JrLmNv\nbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKUN/Xmk4oWfWU2ArWnZ\nh1vW/DDw13y59VL7pD7zfN4V/hhxAm6XvCthavtQJPK5e2EA0d6GFGvqVYPkhqDc\nry2haFHWzUfMAlJrUSfqRJCsqg5J0QZvk3n8IHEi+bvh7olQvTo3Z4PMNWMr/SDn\nTczKhQRorN8VDhvq2SHJcSQKRjGmoREcfRQqWobBiHzOY06aLG+5HKcOI3HvSc3D\nP+r8Rx8HGzxiXcgx4kYxFhw+xlQ3W/4ZsOop7Fy1rhJS3A3yv0P08upRpkjfn25e\nU5frK++z5TBhCmwjgQQv7t0S16Qhcke7OFVaULxi4EibxzPUvzeXQf9+taVNHGGq\nSdkCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAYr5XXhrS4yw5Mlhh0ChytVGiZu1B\nOrA9caZdRAFp5tMLEQ4p1WS3ZKp75mbgP37ZVAiu+3jcoVYYVhifHkEFMqAyX+Wr\neBhODIqixskVxe9R9g7nAMvbC3na1cbzPVS8NEsAzL4kYwKJ4FpyfXyzhTdFSt55\nfanX9eRMJxOsP3dmlkJ3czpEvKFmhRCYMCQsQDkOHpkoLW1j99WJ+E/n5BoOUUNH\ngflocDMIAx+JNK9clPwSELdZJ1CnaRk0d4755nZUNXjfcbx1lVNpNo6qiGgtZpn3\nmmj0tlX0RKYX4b7x/Hn58n73ObmsxUNBVxVDzQxzFciq4encZjSpMck5bA==\n-----END CERTIFICATE-----\n',
              ownedBy: '157731826412',
              creationDate: new Date('2018-08-07T16:22:39.000Z'),
              lastModifiedDate: new Date('2018-08-07T16:22:39.000Z'),
              customerVersion: 1,
              transferData: {},
              generationId: '0d1c2c1e-9f52-4f2f-a59e-d797310a6c44',
              validity: {
                notBefore: new Date('2018-08-07T16:22:39.000Z'),
                notAfter: new Date('2058-08-07T16:22:39.000Z')
              }
            }
          };

        const mockDescribeCertResponse = new DescribeCertificateResponse();
        mockDescribeCertResponse.response = certResponse;
        mockDescribeCertResponse.error = null;
        const mockDescribeCert = mockedIot.describeCertificate = <any>(jest.fn((_params) => mockDescribeCertResponse));

        const createDeviceMock = jest.fn((_params) => {
            return Promise.reject({'status':409, 'error':'CONFLICT', 'msg':'Device already exists'});
        });
        const mockedCreateDevice = mockedDevicesService.createDevice = <any>createDeviceMock;

        const provisionThingMock = jest.fn((_params) => Promise.reject());
        const mockedProvisionThing = mockedThingsService.provisionThing = <any>provisionThingMock;

        // Test -------------------------------------------------------

        const testJitrEvent = {
            'certificateId': 'test-cert-1',
            'caCertificateId': '3f8837752188827',
            'timestamp': 1552061705285,
            'certificateStatus': 'PENDING_ACTIVATION',
            'awsAccountId': '157731826412',
            'certificateRegistrationTimestamp': '1552061705277'
        };

        await instance.activate(testJitrEvent);

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({Bucket: crlBucket, Key: crlKey});
        expect(mockDescribeCert).toBeCalledWith({certificateId: 'test-cert-1'});
        expect(mockedCreateDevice).toBeCalledWith({deviceId:'TestCdfDevice001',templateId:'edge'}, 'unittestprofile');
        expect(mockedProvisionThing).not.toBeCalled();
    });

    it('activation service does not activate if certificate CN does not match templateid::deviceid', async() => {

        // Mocks ------------------------------------------------------

        const crl = { 'revokedCertificates': [
                { 'certificateId': 'revoked-cert-1', 'revokedOn': 1551796535, 'revokedReason': 1 },
                { 'certificateId': 'revoked-cert-2', 'revokedOn': 1551796535, 'revokedReason': 1 }
            ], 'lastUpdate': 1551796535
        };

        const s3BodyBuffer = new Buffer(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {}
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = mockedS3.getObject = <any>(jest.fn((_params) => mockGetObjectResponse));

        // cert pem only has device ID in CN field: TestCdfDevice001
        const certResponse:AWS.Iot.DescribeCertificateResponse = {
            certificateDescription: {
              certificateArn: 'arn:aws:iot:us-west-2:157731826412:cert/test-cert-1',
              certificateId: 'test-cert-1',
              status: 'PENDING_ACTIVATION',
              certificatePem: '-----BEGIN CERTIFICATE-----\nMIID2zCCAsMCCQCjfu9BRlYl1DANBgkqhkiG9w0BAQsFADCBsjELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAldBMRAwDgYDVQQHEwdTZWF0dGxlMR0wGwYDVQQKExRBV1Mg\nUHJvU2VydmUgSW9UIEdTUDEMMAoGA1UECxMDQ0RGMSUwIwYDVQQDExxjb25uZWN0\nZWRkZXZpY2VmcmFtZXdvcmsuY29tMTAwLgYJKoZIhvcNAQkBFiFpbmZvQGNvbm5l\nY3RlZGRldmljZWZyYW1ld29yay5jb20wHhcNMTkwMzA3MjIwMjE0WhcNMjAwNzE5\nMjIwMjE0WjCBqzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMQ8wDQYDVQQHDAZE\nZW52ZXIxIzAhBgNVBAoMGkNvbm5lY3RlZCBEZXZpY2UgRnJhbWV3b3JrMQwwCgYD\nVQQLDANDREYxGTAXBgNVBAMMEFRlc3RDZGZEZXZpY2UwMDExMDAuBgkqhkiG9w0B\nCQEWIWluZm9AY29ubmVjdGVkZGV2aWNlZnJhbWV3b3JrLmNvbTCCASIwDQYJKoZI\nhvcNAQEBBQADggEPADCCAQoCggEBAMvWMU8f/FjSWWR4PkAnbSBNNHC5KMExCXvT\ncQ1aERmkRIrloXUQf7CMyOQQloJlsr1Ps+97NFDkh7XB5IbUdT6D/Bw0wVq1z/v1\n7JAupNGnwPPagxM/xlv7PojMntmQtlM5g8ASoGk0KvTuGBJZsCf4jQUts3obk15z\n5Yg7gwHfjXaHUhJRWEjUtCvmrUtdsI7MbONitGr6heRDfbG1rzCjj+y1cJBWFWQL\naOHnzQW1mU0NJoicNZNI0ou3h/O8vezY+q4GsNrfI02/0/+8hL6x8Iex+KMnXhee\n9Me0tnBwbyxUdV6e5PLuC/2SePblC/Wewg+7UZtPFUMr71qkNYECAwEAATANBgkq\nhkiG9w0BAQsFAAOCAQEAsr1cw2cSKJjK49Q0SHu1s8/2Ro5m210zZasp+AfeOdiQ\njD0uUwKo6tRwM/uMuzFWlC8pGXxhV/6yQEtDEWS/NdnSZJuEa59TPCOURn2hEhJT\ntSHO9IXcDr+YeauwWEwRyqyVweYFRZSQbN4Um+59bSIHKIBMwpMokF6LIBtVtchG\n0Rkvhq6Q+a0gO/HGoJeZgV1Y/8cP2fFP3OugP4FlnRX9UHkUmo2y783ZqNqL5UXr\nFmYkHFw0Y3nV8byN8lYYiaIKT5KrQOQ0N1FvALiB1Ibf4C/W41/pQProa5hD/qR8\nCKL1gNANkVwP3RwsxhluNCLbX9+vyVebCMsJXym4Xg==\n-----END CERTIFICATE-----\n',
              ownedBy: '157731826412',
              creationDate: new Date('2018-08-07T16:22:39.000Z'),
              lastModifiedDate: new Date('2018-08-07T16:22:39.000Z'),
              customerVersion: 1,
              transferData: {},
              generationId: '0d1c2c1e-9f52-4f2f-a59e-d797310a6c44',
              validity: {
                notBefore: new Date('2018-08-07T16:22:39.000Z'),
                notAfter: new Date('2058-08-07T16:22:39.000Z')
              }
            }
          };

        const mockDescribeCertResponse = new DescribeCertificateResponse();
        mockDescribeCertResponse.response = certResponse;
        mockDescribeCertResponse.error = null;
        const mockDescribeCert = mockedIot.describeCertificate = <any>(jest.fn((_params) => mockDescribeCertResponse));

        // Test -------------------------------------------------------

        const testJitrEvent = {
            'certificateId': 'test-cert-1',
            'caCertificateId': '3f8837752188827',
            'timestamp': 1552061705285,
            'certificateStatus': 'PENDING_ACTIVATION',
            'awsAccountId': '157731826412',
            'certificateRegistrationTimestamp': '1552061705277'
        };

        try {
            await instance.activate(testJitrEvent);
            // should error, fail if not
            fail('Expected instance.activate to throw a validation error but it did not.');
        } catch (e) {
           expect(e.name).toEqual('ArgumentError');
        }

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({Bucket: crlBucket, Key: crlKey});
        expect(mockDescribeCert).toBeCalledWith({certificateId: 'test-cert-1'});
    });

    it('activation service activates', async() => {

        // Mocks ------------------------------------------------------

        const crl = { 'revokedCertificates': [
                { 'certificateId': 'revoked-cert-1', 'revokedOn': 1551796535, 'revokedReason': 1 },
                { 'certificateId': 'revoked-cert-2', 'revokedOn': 1551796535, 'revokedReason': 1 }
            ], 'lastUpdate': 1551796535
        };

        const s3BodyBuffer = new Buffer(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {}
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = mockedS3.getObject = <any>(jest.fn((_params) => mockGetObjectResponse));

        // cert pem has template ID and device ID in CN field: edge::TestCdfDevice001
        const certResponse:AWS.Iot.DescribeCertificateResponse = {
            certificateDescription: {
              certificateArn: 'arn:aws:iot:us-west-2:157731826412:cert/test-cert-1',
              certificateId: 'test-cert-1',
              status: 'PENDING_ACTIVATION',
              certificatePem: '-----BEGIN CERTIFICATE-----\nMIID5zCCAs8CCQCjfu9BRlYl1TANBgkqhkiG9w0BAQsFADCBsjELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAldBMRAwDgYDVQQHEwdTZWF0dGxlMR0wGwYDVQQKExRBV1Mg\nUHJvU2VydmUgSW9UIEdTUDEMMAoGA1UECxMDQ0RGMSUwIwYDVQQDExxjb25uZWN0\nZWRkZXZpY2VmcmFtZXdvcmsuY29tMTAwLgYJKoZIhvcNAQkBFiFpbmZvQGNvbm5l\nY3RlZGRldmljZWZyYW1ld29yay5jb20wHhcNMTkwMzE5MTcxMzI2WhcNMjAwNzMx\nMTcxMzI2WjCBtzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQHDAdT\nZWF0dGxlMREwDwYDVQQKDAhQcm9TZXJ2ZTEjMCEGA1UECwwaQ29ubmVjdGVkIERl\ndmljZSBGcmFtZXdvcmsxHzAdBgNVBAMMFmVkZ2U6OlRlc3RDZGZEZXZpY2UwMDEx\nMDAuBgkqhkiG9w0BCQEWIWluZm9AY29ubmVjdGVkZGV2aWNlZnJhbWV3b3JrLmNv\nbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKUN/Xmk4oWfWU2ArWnZ\nh1vW/DDw13y59VL7pD7zfN4V/hhxAm6XvCthavtQJPK5e2EA0d6GFGvqVYPkhqDc\nry2haFHWzUfMAlJrUSfqRJCsqg5J0QZvk3n8IHEi+bvh7olQvTo3Z4PMNWMr/SDn\nTczKhQRorN8VDhvq2SHJcSQKRjGmoREcfRQqWobBiHzOY06aLG+5HKcOI3HvSc3D\nP+r8Rx8HGzxiXcgx4kYxFhw+xlQ3W/4ZsOop7Fy1rhJS3A3yv0P08upRpkjfn25e\nU5frK++z5TBhCmwjgQQv7t0S16Qhcke7OFVaULxi4EibxzPUvzeXQf9+taVNHGGq\nSdkCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAYr5XXhrS4yw5Mlhh0ChytVGiZu1B\nOrA9caZdRAFp5tMLEQ4p1WS3ZKp75mbgP37ZVAiu+3jcoVYYVhifHkEFMqAyX+Wr\neBhODIqixskVxe9R9g7nAMvbC3na1cbzPVS8NEsAzL4kYwKJ4FpyfXyzhTdFSt55\nfanX9eRMJxOsP3dmlkJ3czpEvKFmhRCYMCQsQDkOHpkoLW1j99WJ+E/n5BoOUUNH\ngflocDMIAx+JNK9clPwSELdZJ1CnaRk0d4755nZUNXjfcbx1lVNpNo6qiGgtZpn3\nmmj0tlX0RKYX4b7x/Hn58n73ObmsxUNBVxVDzQxzFciq4encZjSpMck5bA==\n-----END CERTIFICATE-----\n',
              ownedBy: '157731826412',
              creationDate: new Date('2018-08-07T16:22:39.000Z'),
              lastModifiedDate: new Date('2018-08-07T16:22:39.000Z'),
              customerVersion: 1,
              transferData: {},
              generationId: '0d1c2c1e-9f52-4f2f-a59e-d797310a6c44',
              validity: {
                notBefore: new Date('2018-08-07T16:22:39.000Z'),
                notAfter: new Date('2058-08-07T16:22:39.000Z')
              }
            }
          };

        const mockDescribeCertResponse = new DescribeCertificateResponse();
        mockDescribeCertResponse.response = certResponse;
        mockDescribeCertResponse.error = null;
        const mockDescribeCert = mockedIot.describeCertificate = <any>(jest.fn((_params) => mockDescribeCertResponse));

        const mockedCreateDevice = mockedDevicesService.createDevice = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve({'status':201})
            };
        });

        const listPoliciesMock = jest.fn((_params) => {
            return Promise.resolve({
                results: [
                    {
                        policyId: 'unit-test-policy',
                        type: 'ProvisioningTempalte',
                        description: 'Unit Test Provisioning Template',
                        appliesTo: ['/supplier/unittestsupplier'],
                        document: '{"template":"cdf_unit_test"}'
                    }
                ]
            });
        });
        const mockedListPolicies = mockedPoliciesService.listInheritedPoliciesByDevice = <any>listPoliciesMock;

        const updateDeviceMock = jest.fn((_params) => {
            return Promise.resolve({'status':204});
        });
        const mockedUpdateDevice = mockedDevicesService.updateDevice = <any>updateDeviceMock;

        const provisionThingMock = jest.fn((_params) => {
            return Promise.resolve({
                certificatePem: '-----BEGIN CERTIFICATE-----\nMIID5zCCAs8CCQCjfu9BRlYl1TANBgkqhkiG9w0BAQsFADCBsjELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgTAldBMRAwDgYDVQQHEwdTZWF0dGxlMR0wGwYDVQQKExRBV1Mg\nUHJvU2VydmUgSW9UIEdTUDEMMAoGA1UECxMDQ0RGMSUwIwYDVQQDExxjb25uZWN0\nZWRkZXZpY2VmcmFtZXdvcmsuY29tMTAwLgYJKoZIhvcNAQkBFiFpbmZvQGNvbm5l\nY3RlZGRldmljZWZyYW1ld29yay5jb20wHhcNMTkwMzE5MTcxMzI2WhcNMjAwNzMx\nMTcxMzI2WjCBtzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQHDAdT\nZWF0dGxlMREwDwYDVQQKDAhQcm9TZXJ2ZTEjMCEGA1UECwwaQ29ubmVjdGVkIERl\ndmljZSBGcmFtZXdvcmsxHzAdBgNVBAMMFmVkZ2U6OlRlc3RDZGZEZXZpY2UwMDEx\nMDAuBgkqhkiG9w0BCQEWIWluZm9AY29ubmVjdGVkZGV2aWNlZnJhbWV3b3JrLmNv\nbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKUN/Xmk4oWfWU2ArWnZ\nh1vW/DDw13y59VL7pD7zfN4V/hhxAm6XvCthavtQJPK5e2EA0d6GFGvqVYPkhqDc\nry2haFHWzUfMAlJrUSfqRJCsqg5J0QZvk3n8IHEi+bvh7olQvTo3Z4PMNWMr/SDn\nTczKhQRorN8VDhvq2SHJcSQKRjGmoREcfRQqWobBiHzOY06aLG+5HKcOI3HvSc3D\nP+r8Rx8HGzxiXcgx4kYxFhw+xlQ3W/4ZsOop7Fy1rhJS3A3yv0P08upRpkjfn25e\nU5frK++z5TBhCmwjgQQv7t0S16Qhcke7OFVaULxi4EibxzPUvzeXQf9+taVNHGGq\nSdkCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAYr5XXhrS4yw5Mlhh0ChytVGiZu1B\nOrA9caZdRAFp5tMLEQ4p1WS3ZKp75mbgP37ZVAiu+3jcoVYYVhifHkEFMqAyX+Wr\neBhODIqixskVxe9R9g7nAMvbC3na1cbzPVS8NEsAzL4kYwKJ4FpyfXyzhTdFSt55\nfanX9eRMJxOsP3dmlkJ3czpEvKFmhRCYMCQsQDkOHpkoLW1j99WJ+E/n5BoOUUNH\ngflocDMIAx+JNK9clPwSELdZJ1CnaRk0d4755nZUNXjfcbx1lVNpNo6qiGgtZpn3\nmmj0tlX0RKYX4b7x/Hn58n73ObmsxUNBVxVDzQxzFciq4encZjSpMck5bA==\n-----END CERTIFICATE-----\n',
                resourceArns: {
                    thing: 'arn:aws:iot:us-west-2:157731826412:thing/TestCdfDevice001'
                }
            });
        });
        const mockedProvisionThing = mockedThingsService.provisionThing = <any>provisionThingMock;

        // Test -------------------------------------------------------

        const testJitrEvent = {
            'certificateId': 'test-cert-1',
            'caCertificateId': '3f8837752188827',
            'timestamp': 1552061705285,
            'certificateStatus': 'PENDING_ACTIVATION',
            'awsAccountId': '157731826412',
            'certificateRegistrationTimestamp': '1552061705277'
        };

        await instance.activate(testJitrEvent);

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({Bucket: crlBucket, Key: crlKey});
        expect(mockDescribeCert).toBeCalledWith({certificateId: 'test-cert-1'});
        expect(mockedCreateDevice).toBeCalledWith({deviceId:'TestCdfDevice001',templateId:'edge'},'unittestprofile');
        expect(mockedListPolicies).toBeCalledWith('TestCdfDevice001', 'ProvisioningTemplate');
        expect(mockedProvisionThing).toBeCalledWith({
            provisioningTemplateId: 'cdf_unit_test',
            parameters: { ThingName: 'TestCdfDevice001', CertificateId: 'test-cert-1' }
        });
        expect(mockedUpdateDevice).toBeCalledWith('TestCdfDevice001', {attributes: {status: 'active'}, awsIotThingArn: 'arn:aws:iot:us-west-2:157731826412:thing/TestCdfDevice001'
        });
    });
});

// const mockError = (overrides:any) => {
//     const error:AWSError = {code:'', message:'', retryable:false, statusCode:0, time:new Date(), hostname:'',
//     region:'', retryDelay:0, requestId:'', extendedRequestId:'', cfId:'', name:''};
//     return {...error, ...overrides};
// };

class MockGetObjectOutput {
    public response: AWS.S3.Types.GetObjectOutput;
    public error: AWSError;

    promise(): Promise<AWS.S3.Types.GetObjectOutput> {
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

class DescribeCertificateResponse {
    public response: AWS.Iot.Types.DescribeCertificateResponse;
    public error: AWSError;

    promise(): Promise<AWS.Iot.Types.DescribeCertificateResponse> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
