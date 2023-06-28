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
import { RegisterDeviceCertificateWithoutCAParameters } from '../things.models';
import { CertUtils } from '../../utils/cert';

@injectable()
export class RegisterDeviceCertificateWithoutCAStepProcessor implements ProvisioningStepProcessor {

    public constructor(
        @inject(TYPES.CertUtils) private certUtils: CertUtils
    ) {
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: in: stepData: ${JSON.stringify(stepData)}`);

        const cdfParams = stepData?.cdfProvisioningParameters as RegisterDeviceCertificateWithoutCAParameters;
        ow(cdfParams?.certificatePem, 'certificate pem', ow.string.nonEmpty);
        ow(cdfParams?.certificateStatus, 'certificate status', ow.string.nonEmpty);

        const r = await this.certUtils.registerCertificateWithoutCA(cdfParams.certificatePem, cdfParams.certificateStatus);

        if (stepData.parameters===undefined) {
            stepData.parameters = {};
        }
        stepData.parameters.CertificateId = r.certificateId;
        stepData.parameters.CertificateArn = r.certificateArn;

        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: exit:`);
    }
}
