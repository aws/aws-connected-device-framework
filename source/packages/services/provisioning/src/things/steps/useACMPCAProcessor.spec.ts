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
import { ACMPCA, AWSError } from 'aws-sdk';

import { ProvisioningStepData } from './provisioningStep.model';
import { UseACMPCAStepProcessor } from './useACMPCAProcessor';
import { CertUtils } from '../../utils/cert';
import createMockInstance from 'jest-create-mock-instance';

describe('UseACMPCAStepProcessor', () => {

    let instance: UseACMPCAStepProcessor;
    let certUtils: jest.Mocked<CertUtils>;
    const mockACMPCA = new ACMPCA();

    const savedEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...savedEnv };

        certUtils = createMockInstance(CertUtils);
        instance = new UseACMPCAStepProcessor(1, certUtils, () => mockACMPCA);
    })

    afterEach(() => {
        process.env = savedEnv;
    })

    it('should create a certificate using ACM PCA using provided arn and csr', async () => {
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caArn: 'myCaArn',
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: 'myCsr',
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual('myCertificateId');

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: 'myCsr',
            CertificateAuthorityArn: 'myCaArn',
            SigningAlgorithm: 'SHA256WITHRSA',
            Validity: { 
                Value: 123, 
                Type: "DAYS" 
            },
            ApiPassthrough: {
                Subject: {
                    Country: 'myCountry',
                    Organization: 'myOrganization',
                    OrganizationalUnit: 'myOrganizationalUnit',
                    State: 'myStateName',
                    CommonName: 'myCommonName'
                }
            }
        });

        expect(mockedGetCertificate).toBeCalledTimes(2);
        expect(mockedGetCertificate).toBeCalledWith({ 
            CertificateAuthorityArn: 'myCaArn',
            CertificateArn: 'myCertificateArn'
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
    });

    it('should create a certificate using ACM PCA using provided ca alias and csr', async () => {
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        process.env.PCA_MYALIAS = 'myCaArn';

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caAlias: 'myalias',
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: 'myCsr',
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual('myCertificateId');

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: 'myCsr',
            CertificateAuthorityArn: 'myCaArn',
            SigningAlgorithm: 'SHA256WITHRSA',
            Validity: { 
                Value: 123, 
                Type: "DAYS" 
            },
            ApiPassthrough: {
                Subject: {
                    Country: 'myCountry',
                    Organization: 'myOrganization',
                    OrganizationalUnit: 'myOrganizationalUnit',
                    State: 'myStateName',
                    CommonName: 'myCommonName'
                }
            }
        });

        expect(mockedGetCertificate).toBeCalledTimes(2);
        expect(mockedGetCertificate).toBeCalledWith({ 
            CertificateAuthorityArn: 'myCaArn',
            CertificateArn: 'myCertificateArn'
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);

    });

    it('should create a certificate using ACM PCA using provided arn but no csr', async () => {
        const mockedCreatePrivateKey = mockCreatePrivateKey(certUtils);
        const mockedCreateCSR = mockCreateCSR(certUtils);
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caArn: 'myCaArn',
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                }
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual('myCertificateId');

        expect(mockedCreatePrivateKey).toBeCalledTimes(1);

        expect(mockedCreateCSR).toBeCalledTimes(1);

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: 'myCsr',
            CertificateAuthorityArn: 'myCaArn',
            SigningAlgorithm: 'SHA256WITHRSA',
            Validity: { 
                Value: 123, 
                Type: "DAYS" 
            },
            ApiPassthrough: {
                Subject: {
                    Country: 'myCountry',
                    Organization: 'myOrganization',
                    OrganizationalUnit: 'myOrganizationalUnit',
                    State: 'myStateName',
                    CommonName: 'myCommonName'
                }
            }
        });

        expect(mockedGetCertificate).toBeCalledTimes(2);
        expect(mockedGetCertificate).toBeCalledWith({ 
            CertificateAuthorityArn: 'myCaArn',
            CertificateArn: 'myCertificateArn'
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
    });

    it('missing ca alias and arn should throw error', async () => {
        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: 'myCsr',
            },
            state: {}
        };

        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toContain('Either `caAlias` or `caArn` must be provided.');
        }

    });

    it('invalid ca alias should throw error', async () => {

        delete process.env.PCA_INVALID;

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caAlias: 'invalid',
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: 'myCsr',
            },
            state: {}
        };

        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toContain('Invalid `caAlias`.');
        }

    });

    it('missing certinfo should throw error', async () => {
        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caArn: 'myCaArn',
                certInfo: undefined,
                csr: 'myCsr',
            },
            state: {}
        };

        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toContain('`certInfo` must be provided.');
        }

    });

});

function mockGetCertificate(mockACMPCA: ACMPCA) : jest.Mock<any, any> {
    const mockedGetCertificateErrorResponse: AWSError = {
        name: 'ResourceNotFoundException',
        code: 'RequestInProgressException',
        message: '',
        time: undefined,
    };
    const mockedGetCertificateSuccessResponse: ACMPCA.GetCertificateResponse = {
        Certificate: 'certificate-pem'
    };

    const mockedGetCertificate = mockACMPCA.getCertificate = jest.fn()
        // 1st call returns as still in progress
        .mockImplementationOnce(() => {
            return {
                promise: jest.fn().mockRejectedValueOnce(mockedGetCertificateErrorResponse)
            };
        })
        // 2nd call is successful
        .mockImplementationOnce(() => {
            return {
                promise: () => mockedGetCertificateSuccessResponse
            };
        });
    return mockedGetCertificate;
}

function mockIssueCertificate(mockACMPCA: ACMPCA) : jest.Mock<any, any> {
    const mockedIssueCertificateResponse: ACMPCA.IssueCertificateResponse = {
        CertificateArn: 'myCertificateArn',
    };

    const mockedIssueCertificate = mockACMPCA.issueCertificate = jest.fn().mockImplementationOnce(() => {
        return {
            promise: () => mockedIssueCertificateResponse
        };
    });
    return mockedIssueCertificate;
}

function mockCreatePrivateKey(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedCreatePrivateKey = mockCertUtils.createPrivateKey = jest.fn().mockImplementationOnce(() => {
        return 'myPrivateKey';
    });
    return mockedCreatePrivateKey;
}

function mockCreateCSR(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedCreateCSR = mockCertUtils.createCSR = jest.fn().mockImplementationOnce(() => {
        return 'myCsr';
    });
    return mockedCreateCSR;
}

function mockRegisterCertificateWithoutCA(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedRegisterCertificateWithoutCA = mockCertUtils.registerCertificateWithoutCA = jest.fn().mockImplementationOnce(() => {
        return 'myCertificateId';
    });
    return mockedRegisterCertificateWithoutCA;
}
