import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../di/types';
import { ProvisioningStepData } from './provisioningStep.model';
import { ProvisioningStepProcessor } from './provisioningStepProcessor';

@injectable()
export class CreateAwsCertiticateProcessor implements ProvisioningStepProcessor {
    private _iot: AWS.Iot;

    public constructor(@inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        this._iot = iotFactory();
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(
            `CreateAwsCertiticateProcessor: process: in: stepData: ${JSON.stringify(stepData)}`
        );

        const certiticate = await this._iot
            .createKeysAndCertificate({ setAsActive: true })
            .promise();

        stepData.parameters.CaCertificatePem = certiticate.certificatePem;
        stepData.parameters.CertificateId = certiticate.certificateId;
        stepData.parameters.CertificateArn = certiticate.certificateArn;
        stepData.state.privateKey = certiticate.keyPair.PrivateKey;

        logger.debug('CreateAwsCertiticateProcessor: process: exit:');
    }
}
