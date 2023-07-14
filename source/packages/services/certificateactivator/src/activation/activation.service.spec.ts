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
import 'reflect-metadata';

import AWS, { AWSError } from 'aws-sdk';
import { ActivationService } from './activation.service';
import {
    DevicesService,
    PoliciesService,
    Device20Resource,
} from '@awssolutions/cdf-assetlibrary-client';
import { ThingsService } from '@awssolutions/cdf-provisioning-client';
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

        instance = new ActivationService(
            crlBucket,
            crlKey,
            mockedIotFactory,
            mockedS3Factory,
            mockedDevicesService,
            mockedPoliciesService,
            mockedThingsService,
        );
    });

    it('activation service does not activate if cert in CRL', async () => {
        // Mocks ------------------------------------------------------
        const crl = {
            revokedCertificates: [
                { certificateId: 'revoked-cert-1', revokedOn: 1551796535, revokedReason: 1 },
                { certificateId: 'revoked-cert-2', revokedOn: 1551796535, revokedReason: 1 },
            ],
            lastUpdate: 1551796535,
        };

        const s3BodyBuffer = Buffer.from(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {},
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = (mockedS3.getObject = <any>(
            jest.fn((_params) => mockGetObjectResponse)
        ));

        const mockUpdateCertResponse = new UpdateCertificateResponse();
        mockUpdateCertResponse.error = null;
        const mockUpdateCert = (mockedIot.updateCertificate = <any>(
            jest.fn((_params) => mockUpdateCertResponse)
        ));

        // Test -------------------------------------------------------

        const testJitrEvent = {
            certificateId: 'revoked-cert-2',
            caCertificateId: '3f8837752188827',
            timestamp: 1552061705285,
            certificateStatus: 'PENDING_ACTIVATION',
            awsAccountId: 'xxxxxxxxxxxx',
            certificateRegistrationTimestamp: '1552061705277',
        };

        await instance.activate(testJitrEvent);

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({ Bucket: crlBucket, Key: crlKey });
        expect(mockUpdateCert).toBeCalledWith({
            certificateId: 'revoked-cert-2',
            newStatus: 'REVOKED',
        });
    });

    it('activation service does not activate if device not whitelisted', async () => {
        // Mocks ------------------------------------------------------

        const crl = {
            revokedCertificates: [
                { certificateId: 'revoked-cert-1', revokedOn: 1551796535, revokedReason: 1 },
                { certificateId: 'revoked-cert-2', revokedOn: 1551796535, revokedReason: 1 },
            ],
            lastUpdate: 1551796535,
        };

        const s3BodyBuffer = Buffer.from(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {},
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = (mockedS3.getObject = <any>(
            jest.fn((_params) => mockGetObjectResponse)
        ));

        // cert pem has tempate ID and device ID in CN field: edge::TestCdfDevice001
        const certResponse: AWS.Iot.DescribeCertificateResponse = {
            certificateDescription: {
                certificateArn: 'arn:aws:iot:us-west-2:xxxxxxxxxxxx:cert/test-cert-1',
                certificateId: 'test-cert-1',
                status: 'PENDING_ACTIVATION',
                certificatePem:
                    '-----BEGIN CERTIFICATE-----\nMIIC+zCCAeMCCQDheAy2sKa7HTANBgkqhkiG9w0BAQsFADAbMQswCQYDVQQGEwJV\nUzEMMAoGA1UECgwDQ0RGMB4XDTIxMDUyMTIzNDkzMloXDTIyMDUyMTIzNDkzMlow\nZDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMSMwIQYDVQQKDBpDb25uZWN0ZWQg\nRGV2aWNlIEZyYW1ld29yazEMMAoGA1UECwwDQ0RGMRUwEwYDVQQDDAxTMFZVVkV4\nRk1EQXkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDiyY+B4miyEeuF\nmaDWAbsmGukmcSZmI3ZToGXCrS6/InHiEoNZNfh/8s9usUizWsh+L5WEvueaQHw3\nQ697O8N03CTESsEu9sd6OmopiBTJ60m8Bes7fOM2Zwrgd+UO6WjUT0tFg9B3aNUD\nSJSXfVeiGB4CIDN0kHcdrDkPnEAVpTDIpakgN83PQjW2zlN3ucwoYjevkpZZihof\ncbgUQ2EAqi04Gfz9X00tKLQ3i6G95xJySwyEBXZdUjYfbYs0pzpLJWbB1qddhkM+\nr5cosYEWTVud2gRU6GAEz5lr+BjiYCaT1FDHtwZUfpdXNhA/jUPlAN1/Tt1YcDk6\nD8w/QQZVAgMBAAEwDQYJKoZIhvcNAQELBQADggEBADDGDpzhjpmoWUICwR6wgtcd\nnaHn78T4f8lLNY5KR3hmTggqvQl2c2PwiENdZ6gqRqhTimmb0AwNPmvDNfFIwYUJ\nAz1jKfuli6EjffzFXy2gcxOUKnSuxGgOMEabGqz99JyBW/32hXssRbLQKsLmuM3f\naqFwC5jKOhz/15sKHo85M7/Z81yOWJbfCoDYmsNTjoDr7PkLZhe6J9CVUqoPUSta\nKS6HVIM+D1Luys0NArKQUzMP82rHf1c7KuWUg46jBznwffE6zeHMCi03ZlYznxq6\n3l8Rk5YRg2xUKs7z8MRslQgo9f0NmJclij4ZoJXEQhL7mHB1ShgNQS9OAIIAm0g=\n-----END CERTIFICATE-----\n',
                ownedBy: 'xxxxxxxxxxxx',
                creationDate: new Date('2018-08-07T16:22:39.000Z'),
                lastModifiedDate: new Date('2018-08-07T16:22:39.000Z'),
                customerVersion: 1,
                transferData: {},
                generationId: '0d1c2c1e-9f52-4f2f-a59e-d797310a6c44',
                validity: {
                    notBefore: new Date('2018-08-07T16:22:39.000Z'),
                    notAfter: new Date('2058-08-07T16:22:39.000Z'),
                },
            },
        };

        const mockDescribeCertResponse = new DescribeCertificateResponse();
        mockDescribeCertResponse.response = certResponse;
        mockDescribeCertResponse.error = null;
        const mockDescribeCert = (mockedIot.describeCertificate = <any>(
            jest.fn((_params) => mockDescribeCertResponse)
        ));

        const mockedGetDevice = (mockedDevicesService.getDeviceByID = jest
            .fn()
            .mockReturnValueOnce(undefined));

        const mockUpdateCertResponse = new UpdateCertificateResponse();
        mockUpdateCertResponse.error = null;
        const mockUpdateCert = (mockedIot.updateCertificate = <any>(
            jest.fn((_params) => mockUpdateCertResponse)
        ));

        // Test -------------------------------------------------------

        const testJitrEvent = {
            certificateId: 'test-cert-1',
            caCertificateId: '3f8837752188827',
            timestamp: 1552061705285,
            certificateStatus: 'PENDING_ACTIVATION',
            awsAccountId: 'xxxxxxxxxxxx',
            certificateRegistrationTimestamp: '1552061705277',
        };

        try {
            await instance.activate(testJitrEvent);
        } catch (e) {
            expect(e.message).toBe('DEVICE_NOT_WHITELISTED');
        }

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({ Bucket: crlBucket, Key: crlKey });
        expect(mockDescribeCert).toBeCalledWith({ certificateId: 'test-cert-1' });
        expect(mockedGetDevice).toBeCalledWith('KETTLE002');
        expect(mockUpdateCert).toBeCalledWith({
            certificateId: 'test-cert-1',
            newStatus: 'REVOKED',
        });
    });

    it('activation service activates', async () => {
        // Mocks ------------------------------------------------------

        const crl = {
            revokedCertificates: [
                { certificateId: 'revoked-cert-1', revokedOn: 1551796535, revokedReason: 1 },
                { certificateId: 'revoked-cert-2', revokedOn: 1551796535, revokedReason: 1 },
            ],
            lastUpdate: 1551796535,
        };

        const s3BodyBuffer = Buffer.from(JSON.stringify(crl));

        const s3GetObjectResponse = {
            Body: s3BodyBuffer,
            AcceptRanges: 'bytes',
            LastModified: new Date('2018-08-07T16:22:39.000Z'),
            ContentLength: 100,
            ETag: 'e0e8d74cd1095fae4cd91153eb882a48',
            ContentType: 'application/octet-stream',
            Metadata: {},
        };

        const mockGetObjectResponse = new MockGetObjectOutput();
        mockGetObjectResponse.response = s3GetObjectResponse;
        mockGetObjectResponse.error = null;
        const mockedGetObject = (mockedS3.getObject = <any>(
            jest.fn((_params) => mockGetObjectResponse)
        ));

        // cert pem has template ID and device ID in CN field: edge::TestCdfDevice001
        const certResponse: AWS.Iot.DescribeCertificateResponse = {
            certificateDescription: {
                certificateArn: 'arn:aws:iot:us-west-2:xxxxxxxxxxxx:cert/test-cert-1',
                certificateId: 'test-cert-1',
                status: 'PENDING_ACTIVATION',
                certificatePem:
                    '-----BEGIN CERTIFICATE-----\nMIIC+zCCAeMCCQDheAy2sKa7HTANBgkqhkiG9w0BAQsFADAbMQswCQYDVQQGEwJV\nUzEMMAoGA1UECgwDQ0RGMB4XDTIxMDUyMTIzNDkzMloXDTIyMDUyMTIzNDkzMlow\nZDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMSMwIQYDVQQKDBpDb25uZWN0ZWQg\nRGV2aWNlIEZyYW1ld29yazEMMAoGA1UECwwDQ0RGMRUwEwYDVQQDDAxTMFZVVkV4\nRk1EQXkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDiyY+B4miyEeuF\nmaDWAbsmGukmcSZmI3ZToGXCrS6/InHiEoNZNfh/8s9usUizWsh+L5WEvueaQHw3\nQ697O8N03CTESsEu9sd6OmopiBTJ60m8Bes7fOM2Zwrgd+UO6WjUT0tFg9B3aNUD\nSJSXfVeiGB4CIDN0kHcdrDkPnEAVpTDIpakgN83PQjW2zlN3ucwoYjevkpZZihof\ncbgUQ2EAqi04Gfz9X00tKLQ3i6G95xJySwyEBXZdUjYfbYs0pzpLJWbB1qddhkM+\nr5cosYEWTVud2gRU6GAEz5lr+BjiYCaT1FDHtwZUfpdXNhA/jUPlAN1/Tt1YcDk6\nD8w/QQZVAgMBAAEwDQYJKoZIhvcNAQELBQADggEBADDGDpzhjpmoWUICwR6wgtcd\nnaHn78T4f8lLNY5KR3hmTggqvQl2c2PwiENdZ6gqRqhTimmb0AwNPmvDNfFIwYUJ\nAz1jKfuli6EjffzFXy2gcxOUKnSuxGgOMEabGqz99JyBW/32hXssRbLQKsLmuM3f\naqFwC5jKOhz/15sKHo85M7/Z81yOWJbfCoDYmsNTjoDr7PkLZhe6J9CVUqoPUSta\nKS6HVIM+D1Luys0NArKQUzMP82rHf1c7KuWUg46jBznwffE6zeHMCi03ZlYznxq6\n3l8Rk5YRg2xUKs7z8MRslQgo9f0NmJclij4ZoJXEQhL7mHB1ShgNQS9OAIIAm0g=\n-----END CERTIFICATE-----\n',
                ownedBy: 'xxxxxxxxxxxx',
                creationDate: new Date('2018-08-07T16:22:39.000Z'),
                lastModifiedDate: new Date('2018-08-07T16:22:39.000Z'),
                customerVersion: 1,
                transferData: {},
                generationId: '0d1c2c1e-9f52-4f2f-a59e-d797310a6c44',
                validity: {
                    notBefore: new Date('2018-08-07T16:22:39.000Z'),
                    notAfter: new Date('2058-08-07T16:22:39.000Z'),
                },
            },
        };

        const mockDescribeCertResponse = new DescribeCertificateResponse();
        mockDescribeCertResponse.response = certResponse;
        mockDescribeCertResponse.error = null;
        const mockDescribeCert = (mockedIot.describeCertificate = <any>(
            jest.fn((_params) => mockDescribeCertResponse)
        ));

        const device: Device20Resource = {};
        const mockedGetDevice = (mockedDevicesService.getDeviceByID = jest
            .fn()
            .mockReturnValueOnce(device));

        const listPoliciesMock = jest.fn((_params) => {
            return Promise.resolve({
                results: [
                    {
                        policyId: 'unit-test-policy',
                        type: 'ProvisioningTempalte',
                        description: 'Unit Test Provisioning Template',
                        appliesTo: ['/supplier/unittestsupplier'],
                        document: '{"template":"cdf_unit_test"}',
                    },
                ],
            });
        });
        const mockedListPolicies = (mockedPoliciesService.listInheritedPoliciesByDevice = <any>(
            listPoliciesMock
        ));

        const updateDeviceMock = jest.fn((_params) => {
            return Promise.resolve({ status: 204 });
        });
        const mockedUpdateDevice = (mockedDevicesService.updateDevice = <any>updateDeviceMock);

        const provisionThingMock = jest.fn((_params) => {
            return Promise.resolve({
                certificatePem:
                    '-----BEGIN CERTIFICATE-----\nMIIC+zCCAeMCCQDheAy2sKa7HTANBgkqhkiG9w0BAQsFADAbMQswCQYDVQQGEwJV\nUzEMMAoGA1UECgwDQ0RGMB4XDTIxMDUyMTIzNDkzMloXDTIyMDUyMTIzNDkzMlow\nZDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMSMwIQYDVQQKDBpDb25uZWN0ZWQg\nRGV2aWNlIEZyYW1ld29yazEMMAoGA1UECwwDQ0RGMRUwEwYDVQQDDAxTMFZVVkV4\nRk1EQXkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDiyY+B4miyEeuF\nmaDWAbsmGukmcSZmI3ZToGXCrS6/InHiEoNZNfh/8s9usUizWsh+L5WEvueaQHw3\nQ697O8N03CTESsEu9sd6OmopiBTJ60m8Bes7fOM2Zwrgd+UO6WjUT0tFg9B3aNUD\nSJSXfVeiGB4CIDN0kHcdrDkPnEAVpTDIpakgN83PQjW2zlN3ucwoYjevkpZZihof\ncbgUQ2EAqi04Gfz9X00tKLQ3i6G95xJySwyEBXZdUjYfbYs0pzpLJWbB1qddhkM+\nr5cosYEWTVud2gRU6GAEz5lr+BjiYCaT1FDHtwZUfpdXNhA/jUPlAN1/Tt1YcDk6\nD8w/QQZVAgMBAAEwDQYJKoZIhvcNAQELBQADggEBADDGDpzhjpmoWUICwR6wgtcd\nnaHn78T4f8lLNY5KR3hmTggqvQl2c2PwiENdZ6gqRqhTimmb0AwNPmvDNfFIwYUJ\nAz1jKfuli6EjffzFXy2gcxOUKnSuxGgOMEabGqz99JyBW/32hXssRbLQKsLmuM3f\naqFwC5jKOhz/15sKHo85M7/Z81yOWJbfCoDYmsNTjoDr7PkLZhe6J9CVUqoPUSta\nKS6HVIM+D1Luys0NArKQUzMP82rHf1c7KuWUg46jBznwffE6zeHMCi03ZlYznxq6\n3l8Rk5YRg2xUKs7z8MRslQgo9f0NmJclij4ZoJXEQhL7mHB1ShgNQS9OAIIAm0g=\n-----END CERTIFICATE-----\n',
                resourceArns: {
                    thing: 'arn:aws:iot:us-west-2:xxxxxxxxxxxx:thing/kettle002',
                },
            });
        });
        const mockedProvisionThing = (mockedThingsService.provisionThing = <any>(
            provisionThingMock
        ));

        // Test -------------------------------------------------------

        const testJitrEvent = {
            certificateId: 'test-cert-1',
            caCertificateId: '3f8837752188827',
            timestamp: 1552061705285,
            certificateStatus: 'PENDING_ACTIVATION',
            awsAccountId: 'xxxxxxxxxxxx',
            certificateRegistrationTimestamp: '1552061705277',
        };

        await instance.activate(testJitrEvent);

        // Validation -------------------------------------------------

        expect(mockedGetObject).toBeCalledWith({ Bucket: crlBucket, Key: crlKey });
        expect(mockDescribeCert).toBeCalledWith({ certificateId: 'test-cert-1' });
        expect(mockedGetDevice).toBeCalledTimes(1);
        expect(mockedListPolicies).toBeCalledWith('kettle002', 'ProvisioningTemplate');
        expect(mockedProvisionThing).toBeCalledWith({
            provisioningTemplateId: 'cdf_unit_test',
            parameters: { ThingName: 'kettle002', CertificateId: 'test-cert-1' },
        });
        expect(mockedUpdateDevice).toBeCalledWith('KETTLE002', {
            attributes: { status: 'active' },
            awsIotThingArn: 'arn:aws:iot:us-west-2:xxxxxxxxxxxx:thing/kettle002',
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
