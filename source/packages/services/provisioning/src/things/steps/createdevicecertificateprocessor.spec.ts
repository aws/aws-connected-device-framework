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

import AWS from 'aws-sdk';
import createMockInstance from 'jest-create-mock-instance';
import clone from 'just-clone';
import * as pem from 'pem';
import { CertUtils } from '../../utils/cert';
import { CreateDeviceCertificateParameters } from '../things.models';
import { CreateDeviceCertificateStepProcessor } from './createDeviceCertificateProcessor';
import { ProvisioningStepData } from './provisioningStep.model';

describe('CreateDeviceCertificateStepProcessor', () => {
    let instance: CreateDeviceCertificateStepProcessor;

    const mockIot = new AWS.Iot();
    const mockSSM = new AWS.SSM();
    let certUtils: jest.Mocked<CertUtils>;

    beforeEach(() => {
        jest.resetModules();
        certUtils = createMockInstance(CertUtils);
        instance = new CreateDeviceCertificateStepProcessor(
            certUtils,
            () => mockIot,
            () => mockSSM,
            356
        );
    });

    it('device certificate processor should create device cert and key', async () => {
        const cert = {
            certificateDescription: {
                certificateArn:
                    'arn:aws:iot:us-west-2:1234567890:cacert/bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certificateId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                status: 'ACTIVE',
                certificatePem:
                    '-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n',
                ownedBy: '1234567890',
                autoRegistrationStatus: 'ENABLE',
                customerVersion: 2,
                generationId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
            },
        };
        mockIot.describeCACertificate = jest.fn().mockImplementationOnce(() => {
            return {
                promise: () => cert,
            };
        });

        const ssmParam = {
            Parameter: {
                Name: 'cdf-ca-key-bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                Type: 'SecureString',
                Value: '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAotL+0aJBQeqQrheuC+DeO22cQvnXbvIHCIjBHaes/NEYbz6u\nMO2UiaCI6Ukeni5NvGWkFknDvbJcHeCoxcbyOCy7aoMMSUnF7X/FhqUE4IGH489g\nDs8X4yW4qw+8X58abC3zP1V4xduRM90AIMetqG3UA/LOdXONpekmBoNgtLc03GeI\nnekjsYoBLIgRUejmzWKxR3AZC1X07BvUFkkoyVNjhhcnUtoCwqEI261pAPgaRFYG\ndLn4Hs1QyV6gpO2qy7neGCDPQZ5HDoc3YGHEs/3zEbJu5NNsfq5wTdKPRrX5ctZx\nuorYi5/SwFMZIcNlCURUIRcI0wAwvcEFVdtFbQIDAQABAoIBAHZ/uJQ40eV3IPSS\np0hdz17Q1vine/JykkvTuzgp3+vfATl1FLDnN0MyYnHllTLp4AlMr67I4HweYowc\nBLhrobzgUUWjOj3cQwAmDUuArZv2qT9SnUYp0eiue0eDnES7Ni+lAXMGcW8N7Q8h\nuAYjTG9X/wUgoME558zncZUr6CWcRnXlzbeBCiZp1zGvnToSlyHQ8ep9E825x5ta\nQHltgXkjrr0Y+6FedE298h8lIcQbHiVATEHBjRfj5WCitg6u8YqrxqUZX9WcZzMG\n2iIq6V9VcZ1tacYnx9j9GNxsNQmyBzpqH+/uKll+JOnXuMn9NZT96jmO4Z84xS63\nKSDKVMECgYEA1zhrsqDUX9gmMG9tgsWHRnonblgbwlLPcjQqojlFm4KI8orWovWg\n+9PbsXe+1Tc0pM+6Rf24+skVSp+2FfG+yMQHqAVDUEp6jJKUzf0p74Gp15g9HRg/\ntkd2/sDmBXrCwiH9DDdVkcsmfweZM0EE6tf+Nu4dxEHcmDjVUhC5zXMCgYEAwa0F\nWU8vuLsjw4mgcfwxyUPQ7OkQ2TI59yP3OoRmQI1wqEg+EM3A8LX+c1DqBVqntVie\n69JjlTNy0lq8meSJI4C2J45FS4fG6YxGKD6FfWAFhkpRIGaL6F0l1Cwc9xYyKLxc\nN8WZ9Ia4BqWX9ltuLzW4gbiiur6DJ0r5JBHt6Z8CgYAZrV6UCkIsSTKNNs4e+wgf\nrXVE4fg14AFmA7lOb3zRh+pk3ZGsEZgqU2Vzr/CxqYt7WllD/nhyW0lSBOoJhjUX\n6ONs9WvJiYlDej2Msfat349u7HfmH72CNtaIoGURJEtWNA3nxjZMVat7HmH1zn0S\ns8Bdt10PzDfQZX918g7o5wKBgESR4HntOkUaJKBfQqn4kxvh4b9vCOMNEE66shZK\nt/UU3pUF9st2PWA73xmuxRweK5BeDu4JL+6sJ3PoYivOKOuj71nz2f7S1I7tdg1b\njWGFNI+GElD5XYFoMTN8ZsjoV9vqTHAGiupzJAZebH3xgwI979QlrZ+WQdMQjULD\nAkubAoGAGQxGfmWsm4CjZpE2UUikj4lq9PVo25NquJOKKeCEZnEJlELaUo8hX0us\ncW3aPb3MUVQBJCQeqUBDWudWH1bGy4mQZG9zQrLPz9swqF0O1Sr6Sxa1Sot/YU88\n1yLMn9MCu49J2tRNB7Mcs5vImB9v3Pm/zJJ+IvUndiOltycVHu8=\n-----END RSA PRIVATE KEY-----\n',
                Version: 1,
            },
        };
        mockSSM.getParameter = jest.fn().mockImplementationOnce(() => {
            return {
                promise: () => ssmParam,
            };
        });

        const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQB7DXbTjH2WGOwVHlGmZNw//JK9UIORmFRleYHXjR228WonlPD1
cqLjVQVL9emTqntJ4vxye+KE1Fn0mevbqjEIXDZB4pZYO23gFkw12nprH1H5VPpZ
4Qu0gPtyV5R334s6BH8AucN8PaqxfghMW1rCLrOsdDqW8x2m72+reOY55LDc7NF5
T80k6/fzGKi2olJU28elCXmef4KmxAN79EMnx4Ud3cYpFMH7gd0gebZtJeaFY7iY
2KV5XSPRnBgxh+uWsDLRpbXdlelsjWQFdDU54SP8GSy9E5UkTYUW4YxfOzKO2tsH
gxzkeKp7ccXVgypX+V6dsb8W1h6xAt3Jd0D9AgMBAAECggEAHfOZCMUZjH9kd395
wFashaak0Q/X9ohtgoWg5SakJPN+M0Q9ooDUxSDcuTCSOi808zcc24DsEgjeHHua
vU0fwjkvu7m7fp54kCLdSf5z7b8h5N6aUWZFwxniGmLW8Jao/OY7Q6Hzwzn/YlSb
EHrsDHfxo/hmineCsC93rvUulMiMtWWnv5ajQajWvz3JwX2NHlVnHxu1Bjab/UNk
EPR9kHHIpiTy+abp45v6OZCGSdn0UHTjbrnCDLaMWw5LD+Zg7snFao8IKIVSVbSq
MV+HcHsOhhJLT8KhnDG4VeEbCIZix1/DdrBhMIRDEOopLMTYUGxbPfIZR/YKVx9X
mOhMAQKBgQDgltfTcQASEx5vCZd2FU5oGzAAmx+puGPjN06rtKIfeKH+1BwoWbH3
fitpmr01lRuMm/2LGspSEt9+Gv8jKy2/K2/7cnV/QzNwSFDSmlvQB5OILhi6M8zB
vNWW8C1ypJgn45l8KJINqEjj1HLc6EzB0KXXJvGmCq1qxhwU29fFUQKBgQCMQzg3
NUWryXTQa98IBJSktOFa3bQUrrcwtIoetLIx++5uBkOnE4cyDlGbfVjg91zNzgim
oUdQ/E6DR8Yy73n/6i4sxlava7FiXmk/aWYOJrVcG4iDczo42OhSruWkfLuCndzM
qj3209mzT70DxrqQPlQcvSXrcA20egYho2sF7QKBgQDa8DHV3gLDm/+/HwqYAo08
z8Qr0w061pYJmpEGskCZjW/ei8gnTclAC68mc8KfyYvhtu+j+6nf+KYGuSqfjig6
hI3WAe6o8Unj25tusytt0PTxfH5+hqDE/OD7E4g6iloKCMZHUwWOas8jyqdu0saA
6nXBGCXaR+5meFpHu0jNAQKBgAWMr0+34t7OJLoOWo+1pq/xnCz9Mp/S3dqmegSG
/7nsjt15j/mvUx0O5fmx9u9HujtGWJ9HKEwy/2RAVb40LW6LtHH/EvTz3NvYgm+I
2wnaTDitujQBPh97rY1/8AQXD1A2sMLERZlbfnSSxha9KSqF3MwaS8LJ9zDZ1x5D
mfttAoGAYlSLDZMx3xu3gpdPjKClpoSMZYDivUWX8gHP89QyEwI1Al3McTGOez9N
C+MmjmlIYbeIopXIuSjtNMgG5ABdf5/r0P5UpvCkVuNYEsqOEQe/qFjimB13WAkq
ihEsxUIAwQk6QiciHcwBE7wZSHyna04WpxhKwD3aVEhspBihUHk=
-----END RSA PRIVATE KEY-----`;

        certUtils.createPrivateKey = jest.fn().mockResolvedValueOnce(privateKey);

        const csr = `-----BEGIN CERTIFICATE REQUEST-----
MIICqDCCAZACAQAwYzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNPMQ8wDQYDVQQH
DAZEZW52ZXIxEzARBgNVBAoMClVuaXRUZXN0Q28xFDASBgNVBAMMC3VuaXR0ZXN0
LmNvMQswCQYDVQQLDAJRQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
AN3H/buEbBwov2/QVNOD7v3i55BlaSgm683EW4a+FxI8/8A+d4GxAS2kOOC56gA1
H2zYN3TP4diXo/GvsQ8AgcTA+28Quc8Mm4Wv6BUloggd3EuRfus/zt+krKgfeNy8
tVNGtsaEw26qHSGQxLLUlhzLHRi7TeFdtcpU4fRVOVs2xeUZRKTvYKP3QB0V/U1l
uv0BpqAuacC2VUURvqbWLm8P6gVC0JeQWIEWLColqiUzWVDH9yeJHf1aToO509+2
uvHOB0M0QvHWo6xCJFwqnwDWek2C0w1ac00T3kL0DTW69RqVdM/KdJJzNWvXf1Sr
hndeQbxYx5eZzE64itqN/9kCAwEAAaAAMA0GCSqGSIb3DQEBCwUAA4IBAQAoaWvl
llFxswkACjSjFaUmj8z1RqZic3PXLi8Voy4uzY8DB0tZlOQCtOruyVbhG8cWcwTz
Kk3HC9+5wB9jq+uk2CazCDDv312wz0ju0Ksc00Q9mHv7X6iu7BbG8d+6T57ISceU
2j7CxmMCiyne8Ytr3c9XQieabi9va6DShoN+vX0VMBTxp3mGMo5uHHvyLoqfDxis
q8pwAZvJcUfEIu5wFJ4hRjlykN+Rs5WqOk5DpFqTVUcHfMqsfI8ZeX3heDmc/vHc
uw3icwmlsuNd7r8ASIyQhNzZG+INd4ykWKgS+qcIHxsTrJhvPa4PCQYmc5yU6oSv
7IsoNkof2egAjxo2
-----END CERTIFICATE REQUEST-----`;

        certUtils.createCSR = jest.fn().mockResolvedValueOnce(csr);

        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {},
            },
            parameters: {
                test: 'this is only a test',
            },
            cdfProvisioningParameters: {
                caId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certInfo: {
                    commonName: 'unittest.co',
                    organization: 'UnitTestCo',
                    organizationalUnit: 'QA',
                    locality: 'Denver',
                    stateName: 'CO',
                    country: 'US',
                },
            },
            state: {},
        };

        // now do the service call
        const stepData = clone(unitTestStepInput);
        await instance.process(stepData);

        const cdfInputParams =
            unitTestStepInput.cdfProvisioningParameters as CreateDeviceCertificateParameters;
        const cdfOutputParams =
            stepData.cdfProvisioningParameters as CreateDeviceCertificateParameters;

        expect(stepData).toBeDefined();
        expect(stepData.parameters.test).toEqual(unitTestStepInput.parameters.test);
        expect(cdfOutputParams.caId).toEqual(cdfInputParams.caId);
        expect(cdfOutputParams.certInfo).toMatchObject(cdfInputParams.certInfo);
        expect(stepData.parameters.CaCertificatePem).toEqual(
            cert.certificateDescription.certificatePem
        );
        expect(
            stepData.parameters.CertificatePem.startsWith('-----BEGIN CERTIFICATE-----\n')
        ).toBeTruthy();
        expect(
            stepData.parameters.CertificatePem.endsWith('-----END CERTIFICATE-----')
        ).toBeTruthy();
        expect(
            stepData.state.privateKey.startsWith('-----BEGIN RSA PRIVATE KEY-----\n')
        ).toBeTruthy();
        expect(stepData.state.privateKey.endsWith('-----END RSA PRIVATE KEY-----')).toBeTruthy();

        const certInfo = await getCertInfo(stepData.parameters.CertificatePem);
        expect(certInfo.country).toEqual(cdfInputParams.certInfo.country);
        expect(certInfo.state).toEqual(cdfInputParams.certInfo.stateName);
        expect(certInfo.locality).toEqual(cdfInputParams.certInfo.locality);
        expect(certInfo.organization).toEqual(cdfInputParams.certInfo.organization);
        expect(certInfo.organizationUnit).toEqual(cdfInputParams.certInfo.organizationalUnit);
        expect(certInfo.commonName).toEqual(cdfInputParams.certInfo.commonName);
    });

    it('device certificate processor should throw an error if input does not have cdfProvisioningParameters', async () => {
        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {},
            },
            parameters: {
                test: 'this is only a test',
            },
            cdfProvisioningParameters: undefined,
            state: {},
        };

        // now do the service call
        try {
            await instance.process(unitTestStepInput);
            fail();
        } catch (e) {
            expect(e.message).toContain(
                'Expected `certInfo` to be of type `object` but received type `undefined`'
            );
        }
    });

    it('device certificate processor should throw an error if cdfProvisioningParameters do not have caId', async () => {
        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {},
            },
            parameters: {
                test: 'this is only a test',
            },
            cdfProvisioningParameters: {
                caId: undefined,
                certInfo: {
                    commonName: 'unittest.co',
                    organization: 'UnitTestCo',
                    organizationalUnit: 'QA',
                    locality: 'Denver',
                    stateName: 'CO',
                    country: 'US',
                    emailAddress: 'xxxxxxxxxxxxxx',
                },
            },
            state: {},
        };

        // now do the service call
        const stepData = clone(unitTestStepInput);
        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toEqual(
                'Expected `caId` to be of type `string` but received type `undefined`'
            );
        }
    });

    it('device certificate processor should throw an error if cdfProvisioningParameters do not have certInfo', async () => {
        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {},
            },
            parameters: {
                test: 'this is only a test',
            },
            cdfProvisioningParameters: {
                caId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certInfo: undefined,
            },
            state: {},
        };

        // now do the service call
        try {
            await instance.process(unitTestStepInput);
            fail();
        } catch (e) {
            expect(e.message).toContain(
                'Expected `certInfo` to be of type `object` but received type `undefined`'
            );
        }
    });
});

function getCertInfo(cert: string): Promise<pem.CertificateSubjectReadResult> {
    return new Promise((resolve, reject) => {
        pem.readCertificateInfo(cert, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
