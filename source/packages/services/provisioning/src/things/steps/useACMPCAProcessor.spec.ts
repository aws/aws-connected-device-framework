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
import { ACMPCA, AWSError, Iot } from 'aws-sdk';

import { ProvisioningStepData } from './provisioningStep.model';
import { UseACMPCAStepProcessor } from './useACMPCAProcessor';
import { CertUtils } from '../../utils/cert';
import createMockInstance from 'jest-create-mock-instance';
import { CertificateStatus, UseACMPCAParameters } from '../things.models';

// mocked values
const ACMCPA_CA_ARN = 'arn:aws:acm-pca:us-west-2:123456789012:certificate-authority/abcde';
const ACMCPA_CA_ALIAS = 'amcpca1';
const IOT_CA_ARN = 'arn:aws:iot:us-west-2:123456789012:cacert/12345';
const IOT_CA_PEM = 'ca-pem';
const CERTIFICATE_ARN =  'arn:aws:iot:us-west-2:123456789012:cert/67890';
const CERTIFICATE_ID =  '67890';
const CERTIFICATE_PEM = 'certificate-pem';
const CERTIFICATE_CHAIN_PEM = 'certificate-chain-pem';
const PRIVATE_KEY = 'private-key';
const CSR = 'csr';

describe('UseACMPCAStepProcessor', () => {

    let instance: UseACMPCAStepProcessor;
    const mockIot = new Iot();
    let certUtils: jest.Mocked<CertUtils>;
    const mockACMPCA = new ACMPCA();

    const savedEnv = process.env;


    beforeEach(() => {
        jest.resetModules();
        process.env = { ...savedEnv };

        certUtils = createMockInstance(CertUtils);
        instance = new UseACMPCAStepProcessor(1, certUtils, () => mockIot, () => mockACMPCA);
    })

    afterEach(() => {
        process.env = savedEnv;
    })

    it('should create a certificate using ACM PCA (without CA) using provided arn and csr', async () => {
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaArn : ACMCPA_CA_ARN,
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: CSR,
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual(CERTIFICATE_ID);

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: CSR,
            CertificateAuthorityArn: ACMCPA_CA_ARN,
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
            CertificateAuthorityArn: ACMCPA_CA_ARN,
            CertificateArn: CERTIFICATE_ARN
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
        expect(mockedRegisterCertificateWithoutCA).toBeCalledWith(
            CERTIFICATE_PEM + '\n' + CERTIFICATE_CHAIN_PEM, CertificateStatus.ACTIVE
        )
    });

    it('should create a certificate using ACM PCA (without CA) using provided ca alias and csr', async () => {
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        process.env.PCA_AMCPCA1 = ACMCPA_CA_ARN;

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaAlias : ACMCPA_CA_ALIAS,
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: CSR,
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual(CERTIFICATE_ID);

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: CSR,
            CertificateAuthorityArn: ACMCPA_CA_ARN,
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
            CertificateAuthorityArn: ACMCPA_CA_ARN,
            CertificateArn: CERTIFICATE_ARN
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
        expect(mockedRegisterCertificateWithoutCA).toBeCalledWith(
            CERTIFICATE_PEM + '\n' + CERTIFICATE_CHAIN_PEM, CertificateStatus.ACTIVE
        )

    });

    it('should create a certificate using ACM PCA (without CA) using provided arn but no csr', async () => {
        const mockedCreatePrivateKey = mockCreatePrivateKey(certUtils);
        const mockedCreateCSR = mockCreateCSR(certUtils);
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedRegisterCertificateWithoutCA = mockRegisterCertificateWithoutCA(certUtils);

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaArn : ACMCPA_CA_ARN,
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
        expect(stepData.parameters.CertificateId).toEqual(CERTIFICATE_ID);

        expect(mockedCreatePrivateKey).toBeCalledTimes(1);

        expect(mockedCreateCSR).toBeCalledTimes(1);
        expect(mockedCreateCSR).toBeCalledWith(
            PRIVATE_KEY, (stepData.cdfProvisioningParameters as UseACMPCAParameters).certInfo
        )

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: CSR,
            CertificateAuthorityArn: ACMCPA_CA_ARN,
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
            CertificateAuthorityArn: ACMCPA_CA_ARN,
            CertificateArn: CERTIFICATE_ARN
        });

        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
        expect(mockedRegisterCertificateWithoutCA).toBeCalledWith(
            CERTIFICATE_PEM + '\n' + CERTIFICATE_CHAIN_PEM, CertificateStatus.ACTIVE
        )
    });

    it('should create a certificate using ACM PCA (with CA) using provided arn and csr', async () => {
        const mockedIssueCertificate = mockIssueCertificate(mockACMPCA);
        const mockedGetCertificate = mockGetCertificate(mockACMPCA);
        const mockedGetCaCertificate = mockGetCaCertificate(certUtils);
        const mockedRegisterCertificate = mockRegisterCertificate(mockIot);

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITH_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaArn : ACMCPA_CA_ARN,
                awsiotCaArn : IOT_CA_ARN,
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: CSR,
            },
            state: {}
        };

        await instance.process(stepData);

        expect(stepData).toBeDefined();
        expect(stepData.parameters.CertificateId).toEqual(CERTIFICATE_ID);

        expect(mockedIssueCertificate).toBeCalledTimes(1);
        expect(mockedIssueCertificate).toBeCalledWith({
            Csr: CSR,
            CertificateAuthorityArn: ACMCPA_CA_ARN,
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
            CertificateAuthorityArn: ACMCPA_CA_ARN,
            CertificateArn: CERTIFICATE_ARN
        });

        expect(mockedGetCaCertificate).toBeCalledTimes(1);
        expect(mockedGetCaCertificate).toBeCalledWith(IOT_CA_ARN);

        expect(mockedRegisterCertificate).toBeCalledTimes(1);
        expect(mockedRegisterCertificate).toBeCalledWith({ 
            certificatePem: CERTIFICATE_PEM + '\n' + CERTIFICATE_CHAIN_PEM,
            caCertificatePem: IOT_CA_PEM,
            setAsActive: true,
            status: CertificateStatus.ACTIVE
        });
    });

    it('missing ca alias and arn should throw error', async () => {
        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
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
                csr: CSR,
            },
            state: {}
        };

        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toContain('Either `acmpcaCaAlias` or `acmpcaCaArn` must be provided.');
        }

    });

    it('invalid ca alias should throw error', async () => {

        delete process.env.PCA_INVALID;

        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaAlias: 'invalid',
                certInfo: {
                    commonName: 'myCommonName',
                    country: 'myCountry',
                    stateName: 'myStateName',
                    organization: 'myOrganization',
                    organizationalUnit: 'myOrganizationalUnit',
                    daysExpiry: 123
                },
                csr: CSR,
            },
            state: {}
        };

        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toContain('Invalid `acmpcaCaAlias`.');
        }

    });

    it('missing certinfo should throw error', async () => {
        const stepData: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {
                    acmpca: {
                        mode: 'REGISTER_WITHOUT_CA'
                    }
                }
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                acmpcaCaArn: ACMCPA_CA_ARN,
                certInfo: undefined,
                csr: CSR,
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
        Certificate: CERTIFICATE_PEM,
        CertificateChain: CERTIFICATE_CHAIN_PEM
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
        CertificateArn: CERTIFICATE_ARN,
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
        return PRIVATE_KEY;
    });
    return mockedCreatePrivateKey;
}

function mockCreateCSR(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedCreateCSR = mockCertUtils.createCSR = jest.fn().mockImplementationOnce(() => {
        return CSR;
    });
    return mockedCreateCSR;
}

function mockGetCaCertificate(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedGetCaCertificate = mockCertUtils.getCaCertificate = jest.fn().mockImplementationOnce(() => {
        return IOT_CA_PEM;
    });
    return mockedGetCaCertificate;
}

function mockRegisterCertificate(mockIot: Iot) : jest.Mock<any, any> {
    const mockedRegisterCertificateResponse: Iot.RegisterCertificateResponse = {
        certificateArn: CERTIFICATE_ARN,
        certificateId: CERTIFICATE_ID
    };

    const mockedRegisterCertificate = mockIot.registerCertificate = jest.fn().mockImplementationOnce(() => {
        return {
            promise: () => mockedRegisterCertificateResponse
        };
    });
    return mockedRegisterCertificate;
}

function mockRegisterCertificateWithoutCA(mockCertUtils: CertUtils) : jest.Mock<any, any> {
    const mockedRegisterCertificateWithoutCA = mockCertUtils.registerCertificateWithoutCA = jest.fn().mockImplementationOnce(() => {
        return CERTIFICATE_ID;
    });
    return mockedRegisterCertificateWithoutCA;
}
