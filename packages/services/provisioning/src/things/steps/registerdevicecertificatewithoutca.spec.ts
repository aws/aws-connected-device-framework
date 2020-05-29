/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS from 'aws-sdk';

import {RegisterDeviceCertificateWithoutCAStepProcessor} from './registerdevicecertificatewithoutcaprocessor';
import {ProvisioningStepInput, ProvisioningStepOutput} from './provisioningstep.model';
import {CertificateStatus} from '../things.models';

describe('RegisterDeviceCertificateWithoutCAStepProcessor', () => {
    let instance: RegisterDeviceCertificateWithoutCAStepProcessor;

    const mockIot = new AWS.Iot();

    it('should register a certificate without a CA', async () => {
       instance = new RegisterDeviceCertificateWithoutCAStepProcessor(() => mockIot);

       const registerCertificateWithoutCAMockResponse = {
           certificateId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
           certificateArn: 'arn:aws:iot:us-west-2:1234567890:cacert/bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
       };

        const mockedRegisterCertificateWithoutCA = mockIot.registerCertificateWithoutCA = jest.fn().mockImplementationOnce(()=> {
            return {
                promise: () => registerCertificateWithoutCAMockResponse
            };
        });

       const mockStepInput: ProvisioningStepInput = {
           template: {
               Resources: {},
               Parameters: {},
               CDF: {}
           },
           parameters: {
               'test': 'this is only a test'
           },
           cdfProvisioningParameters: {
               certificatePem: '-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n',
               certificateStatus: CertificateStatus.ACTIVE
           }
       };

       const output: ProvisioningStepOutput = await instance.process(mockStepInput);

        expect(output).toBeDefined();
        expect(output.parameters.CertificateId).toEqual(registerCertificateWithoutCAMockResponse.certificateId);
        expect(mockedRegisterCertificateWithoutCA).toBeCalledTimes(1);
    });
});
