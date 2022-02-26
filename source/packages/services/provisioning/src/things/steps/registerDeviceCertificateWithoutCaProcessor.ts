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
import { CertificateStatus, RegisterDeviceCertificateWithoutCAParameters } from '../things.models';

@injectable()
export class RegisterDeviceCertificateWithoutCAStepProcessor implements ProvisioningStepProcessor {

    private _iot: AWS.Iot;

    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot
    ) {
        this._iot = iotFactory();
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: in: stepData: ${JSON.stringify(stepData)}`);

        const cdfParams = stepData?.cdfProvisioningParameters as RegisterDeviceCertificateWithoutCAParameters;
        ow(cdfParams?.certificatePem, 'certificate pem', ow.string.nonEmpty);
        ow(cdfParams?.certificateStatus, 'certificate status', ow.string.nonEmpty);

        const certificateId = await this.registerCertificateWithoutCA(cdfParams.certificatePem, cdfParams.certificateStatus);

        if (stepData.parameters===undefined) {
            stepData.parameters = {};
        }
        stepData.parameters.CertificateId = certificateId;

        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: exit:`);
    }

    private async registerCertificateWithoutCA(certificatePem: string, status: CertificateStatus): Promise<string> {
        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: registerCertificateWithoutCA: in: ${certificatePem}`);

        const params: AWS.Iot.RegisterCertificateWithoutCARequest = {
            certificatePem,
            status
        };

        let result;
        try {
            result = await this._iot.registerCertificateWithoutCA(params).promise();
        } catch (err) {
            logger.error(err);
            throw err;
        }

        return result.certificateId;
    }
}
