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
import { ProvisioningStepProcessor } from './provisioningStepProcessor';
import { ProvisioningStepData } from './provisioningStep.model';
import { logger } from '../../utils/logger';
import { TYPES } from '../../di/types';
import AWS from 'aws-sdk'
import ow from 'ow';
import { CreateDeviceCertificateParameters } from '../things.models';
import { CertUtils } from '../../utils/cert';
import * as pem from 'pem';

@injectable()
export class CreateDeviceCertificateStepProcessor implements ProvisioningStepProcessor {

  private _iot: AWS.Iot;
  private _ssm: AWS.SSM;

  public constructor(
    @inject(TYPES.CertUtils) private certUtils: CertUtils,  
    @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
    @inject('deviceCertificateExpiryDays') private defaultExpiryDays: number) {

      this._iot = iotFactory();
      this._ssm = ssmFactory();
  }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`CreateDeviceCertificateStepProcessor: process: in: stepData: ${JSON.stringify(stepData)}`);

        const params = stepData?.cdfProvisioningParameters as CreateDeviceCertificateParameters;
        ow(params?.certInfo, 'certInfo', ow.object.nonEmpty);
        ow(params?.caId, 'caId', ow.string.nonEmpty);

        const futures:Promise<string>[] = [
            this.getCaPem(params?.caId),
            this.getCaPrivateKey(params?.caId),
            this.certUtils.createPrivateKey()
        ];

        const [caPem,caKey,privateKey] = await Promise.all(futures);

        const csr = await this.certUtils.createCSR(privateKey, params.certInfo);
        const certificate = await this.createCertificate(csr, params.certInfo.daysExpiry ?? this.defaultExpiryDays,  caKey, caPem);

        if (stepData.parameters===undefined) {
            stepData.parameters = {};
        }
        stepData.parameters.CaCertificatePem = caPem;
        stepData.parameters.CertificatePem = certificate;
        stepData.state.privateKey = privateKey;

        logger.debug('CreateDeviceCertificateStepProcessor: process: exit:');
    }

    private async getCaPem (caCertId:string) : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: getCaPem: in: caCertId: ${caCertId}`);
        const params = {
            certificateId: caCertId
        };
        const caDescription = await this._iot.describeCACertificate(params).promise();
        logger.debug('CreateDeviceCertificateStepProcessor: getCaPem: exit: REDACTED');
        return caDescription.certificateDescription.certificatePem;
    }

    private async getCaPrivateKey(caCertId:string) : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: getCaPrivateKey: in: caCertId: ${caCertId}`);
        const params = {
            Name: `cdf-ca-key-${caCertId}`,
            WithDecryption: true
        };

        const ssmResponse = await this._ssm.getParameter(params).promise();
        logger.debug('CreateDeviceCertificateStepProcessor: getCaPrivateKey: exit: REDACTED');
        return ssmResponse.Parameter.Value;
    }

    private createCertificate(csr:string, days:number, rootKey:string, rootPem:string) : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: createCertificate: in: csr:${csr}, days:${days}, rootKey:${rootKey}, rootPem:${rootPem}`);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve:any,reject:any) =>  {
            pem.createCertificate({csr, days, serviceKey:rootKey, serviceCertificate:rootPem}, (err:any, data:any) => {
                if(err) {
                    logger.debug(`CreateDeviceCertificateStepProcessor: createCertificate: err:${JSON.stringify(err)}`);
                    return reject(err);
                }
                logger.debug(`CreateDeviceCertificateStepProcessor: createCertificate: exit:${data.certificate}`);
                return resolve(data.certificate);
            });
        });
    }
}
