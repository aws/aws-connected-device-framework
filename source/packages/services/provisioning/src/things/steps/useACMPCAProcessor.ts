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
import { injectable, inject } from 'inversify';
import ow from 'ow';

import { TYPES } from '../../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

import { ProvisioningStepData } from './provisioningStep.model';
import { ProvisioningStepProcessor } from './provisioningStepProcessor';
import { UseACMPCAParameters, CertInfo, CertificateStatus } from '../things.models';
import { ACMPCA } from 'aws-sdk';
import { CertUtils } from '../../utils/cert';

@injectable()
export class UseACMPCAStepProcessor implements ProvisioningStepProcessor {
    private iot: AWS.Iot;

    public constructor(
        @inject('deviceCertificateExpiryDays') private defaultExpiryDays: number,
        @inject(TYPES.CertUtils) private certUtils: CertUtils,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        // as the ACMPCA may be configured for cross-account access, we use the factory directly which includes automatic STS expiration handling
        @inject(TYPES.ACMPCAFactory) private acmpcaFactory: () => ACMPCA,
    ) {
        this.iot = iotFactory();
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`UseACMPCAStepProcessor: process: in: stepData: ${JSON.stringify(stepData)}`);

        const templateParams = stepData?.template?.CDF?.acmpca;
        ow(
            templateParams,
            ow.object.message('Missing ACM PCA config in the provisioning template.'),
        );
        ow(templateParams.mode, ow.string.oneOf(['REGISTER_WITH_CA', 'REGISTER_WITHOUT_CA']));

        const cdfParams = stepData?.cdfProvisioningParameters as UseACMPCAParameters;

        if (templateParams.mode === 'REGISTER_WITH_CA') {
            if (cdfParams.awsiotCaAlias) {
                cdfParams.awsiotCaArn =
                    process.env[`CA_${cdfParams.awsiotCaAlias?.toUpperCase()}`];
                ow(cdfParams.awsiotCaArn, ow.string.message('Invalid `awsiotCaAlias`.'));
            } else {
                ow(
                    cdfParams.awsiotCaArn,
                    ow.string.message(
                        'Either `awsiotCaAlias` or `awsiotCaArn` must be provided when the provisoning template is configured to use ACM PCA in `REGISTER_WITH_CA` mode.',
                    ),
                );
            }
        }

        if (cdfParams.acmpcaCaAlias) {
            cdfParams.acmpcaCaArn = process.env[`PCA_${cdfParams.acmpcaCaAlias?.toUpperCase()}`];
            ow(cdfParams.acmpcaCaArn, ow.string.message('Invalid `acmpcaCaAlias`.'));
        } else {
            ow(
                cdfParams.acmpcaCaArn,
                ow.string.message('Either `acmpcaCaAlias` or `acmpcaCaArn` must be provided.'),
            );
        }

        ow(cdfParams.certInfo, ow.object.message('`certInfo` must be provided.'));

        // create a csr if none provided
        if (cdfParams.csr === undefined) {
            const privateKey = await this.certUtils.createPrivateKey();
            cdfParams.csr = await this.certUtils.createCSR(privateKey, cdfParams.certInfo);
            ow(
                cdfParams.csr,
                ow.string.message('No `csr` was provided, and auto-generation failed.'),
            );
        }

        // create the device certificate using ACM PCA
        stepData.state.certificatePem = await this.createCert(
            cdfParams.csr,
            cdfParams.acmpcaCaArn,
            cdfParams.certInfo,
        );

        if (stepData.parameters === undefined) {
            stepData.parameters = {};
        }

        if (templateParams.mode === 'REGISTER_WITH_CA') {
            // register the device cert with AWS IoT using a CA
            const caCertificatePem: string = await this.certUtils.getCaCertificate(
                cdfParams.awsiotCaArn,
            );
            const r = await this.iot
                .registerCertificate({
                    certificatePem: stepData.state.certificatePem,
                    caCertificatePem,
                    setAsActive: true,
                    status: CertificateStatus.ACTIVE,
                })
                .promise();
            stepData.parameters.CertificateId = r.certificateId;
            stepData.parameters.CertificateArn = r.certificateArn;
        } else {
            // register the device cert with AWS IoT without a CA
            const r = await this.certUtils.registerCertificateWithoutCA(
                stepData.state.certificatePem,
                CertificateStatus.ACTIVE,
            );
            stepData.parameters.CertificateId = r.certificateId;
            stepData.parameters.CertificateArn = r.certificateArn;
        }

        logger.debug(`UseACMPCAStepProcessor: process: exit:`);
    }

    private async createCert(csr: string, caArn: string, certInfo: CertInfo): Promise<string> {
        logger.debug(
            `UseACMPCAStepProcessor: createCert: in: caArn:${caArn}, certInfo:${JSON.stringify(
                certInfo,
            )}, csr:${csr}`,
        );

        const params: ACMPCA.IssueCertificateRequest = {
            Csr: csr,
            CertificateAuthorityArn: caArn,
            SigningAlgorithm: 'SHA256WITHRSA',
            Validity: {
                Value: certInfo.daysExpiry ?? this.defaultExpiryDays,
                Type: 'DAYS',
            },
            ApiPassthrough: {
                Subject: {
                    Country: certInfo.country,
                    Organization: certInfo.organization,
                    OrganizationalUnit: certInfo.organizationalUnit,
                    State: certInfo.stateName,
                    CommonName: certInfo.commonName?.toString(),
                },
            },
        };

        const issueResponse: ACMPCA.IssueCertificateResponse = await this.acmpcaFactory()
            .issueCertificate(params)
            .promise();

        let getResponse: ACMPCA.GetCertificateResponse;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                getResponse = await this.acmpcaFactory()
                    .getCertificate({
                        CertificateAuthorityArn: caArn,
                        CertificateArn: issueResponse.CertificateArn,
                    })
                    .promise();
                break;
            } catch (err) {
                if (
                    err.code === 'RequestInProgressException' ||
                    err.code === 'ThrottlingException'
                ) {
                    // Need to factor in the time ACMPCA takes to issue the certificate using the retryDelay returned in the error payload
                    await this.sleep(err.retryDelay);
                    continue;
                } else {
                    throw err;
                }
            }
        }

        // the returned ACMPCA generated device certificate needs to include the full certificate chain
        return `${getResponse.Certificate}\n${getResponse.CertificateChain}`;
    }

    private async sleep(time: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.silly(`sleeping for: ${time}ms`);
                clearTimeout(timeout);
                resolve(undefined);
            }, time);
        }).then(() => {
            return;
        });
    }
}
