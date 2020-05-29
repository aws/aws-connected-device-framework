import { injectable, inject } from 'inversify';
import ow from 'ow';

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { ProvisioningStepInput, ProvisioningStepOutput } from './provisioningstep.model';
import { ProvisioningStepProcessor } from './provisioningstepprocessor';
import { CertificateStatus } from '../things.models';

@injectable()
export class RegisterDeviceCertificateWithoutCAStepProcessor implements ProvisioningStepProcessor {

    private _iot: AWS.Iot;

    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot
    ) {
        this._iot = iotFactory();
    }

    public async process(stepInput: ProvisioningStepInput): Promise<ProvisioningStepOutput> {
        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: in: stepInput: ${JSON.stringify(stepInput)}`);

        ow(stepInput?.cdfProvisioningParameters?.certificatePem, ow.string.nonEmpty);

        const output: ProvisioningStepOutput = {
            parameters: stepInput.parameters,
            cdfProvisioningParameters: stepInput.cdfProvisioningParameters
        };

        const certificateId = await this.registerCertificateWithoutCA(stepInput.cdfProvisioningParameters.certificatePem, stepInput.cdfProvisioningParameters.certificateStatus);

        output.parameters.CertificateId = certificateId;

        logger.debug(`RegisterDeviceCertificateWithoutCAStepProcessor: process: exit: ${JSON.stringify(output)}`);

        return output;

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
