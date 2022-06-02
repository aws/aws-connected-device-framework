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
import { logger } from '../../utils/logger';

import { ProvisioningStepData } from './provisioningStep.model';
import { ProvisioningStepProcessor } from './provisioningStepProcessor';
import { UseACMPCAParameters, CertInfo, CertificateStatus } from '../things.models';
import { ACMPCA} from 'aws-sdk'
import { CertUtils } from '../../utils/cert';

@injectable()
export class UseACMPCAStepProcessor implements ProvisioningStepProcessor {

    public constructor(
        @inject('deviceCertificateExpiryDays') private defaultExpiryDays: number,
        @inject(TYPES.CertUtils) private certUtils: CertUtils,
        // as the ACMPCA may require cross-account, we use the factory directly that includes automatic STS expiration handling
        @inject(TYPES.ACMPCAFactory) private acmpcaFactory: () => ACMPCA
    ) {        
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`UseACMPCAStepProcessor: process: in: stepData: ${JSON.stringify(stepData)}`);

        const cdfParams = stepData?.cdfProvisioningParameters as UseACMPCAParameters;
        ow(cdfParams?.caAlias ?? cdfParams?.caArn, ow.string.message('Either `caAlias` or `caArn` must be provided.'));
        ow(cdfParams.certInfo, ow.object.message('`certInfo` must be provided.'));

        // create a csr if none provided
        if (cdfParams.csr === undefined) {
            const privateKey = await this.certUtils.createPrivateKey();
            cdfParams.csr = await this.certUtils.createCSR(privateKey, cdfParams.certInfo);
            ow(cdfParams.csr, ow.string.message('No `csr` was provided, and auto-generation failed.'));
        }

        // if a CA alias was provided, retrieve its corresponding arn
        if (cdfParams.caAlias) {
            cdfParams.caArn = process.env[`PCA_${cdfParams.caAlias?.toUpperCase()}`];
            ow(cdfParams.caArn, ow.string.message('Invalid `caAlias`.'));
        }

        // create the certificate
        const pem = await this.createCert(cdfParams.csr, cdfParams.caArn, cdfParams.certInfo);

        // register the cert (without a CA)
        const certificateId = await this.certUtils.registerCertificateWithoutCA(pem, CertificateStatus.ACTIVE);

        if (stepData.parameters===undefined) {
            stepData.parameters = {};
        }
        stepData.parameters.CertificateId = certificateId;

        logger.debug(`UseACMPCAStepProcessor: process: exit:`);
    }

    private async createCert(csr: string, caArn:string, certInfo:CertInfo): Promise<string> {
        logger.debug(`UseACMPCAStepProcessor: createCert: in: caArn:${caArn}, certInfo:${JSON.stringify(certInfo)}, csr:${csr}`);

        const params: ACMPCA.IssueCertificateRequest = {
            Csr: csr,
            CertificateAuthorityArn: caArn,
            SigningAlgorithm: "SHA256WITHRSA",
            Validity: { 
                Value: certInfo.daysExpiry ?? this.defaultExpiryDays, 
                Type: "DAYS" 
            },
            ApiPassthrough: {
                Subject: {
                    Country: certInfo.country,
                    Organization: certInfo.organization,
                    OrganizationalUnit: certInfo.organizationalUnit,
                    State: certInfo.stateName,
                    CommonName: certInfo.commonName?.toString()
                }
            }
        };

        const issueResponse: ACMPCA.IssueCertificateResponse = await this.acmpcaFactory().issueCertificate(params).promise();
        
        let getResponse: ACMPCA.GetCertificateResponse;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try{
                getResponse =  await this.acmpcaFactory().getCertificate({ 
                    CertificateAuthorityArn: caArn,
                    CertificateArn: issueResponse.CertificateArn 
                }).promise();
                break;
            } catch(err) {
                if(err.code === 'RequestInProgressException' || err.code === 'ThrottlingException') {
                    // Need to factor in the time ACMPCA takes to issue the certificate using the retryDelay returned in the error payload
                    await this.sleep(err.retryDelay); 
                    continue
                } else {
                    throw err;
                }
            }
        }      
        return getResponse.Certificate;
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
