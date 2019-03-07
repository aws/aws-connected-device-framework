import { injectable, inject } from 'inversify';
import { ProvisioningStepProcessor } from './provisioningstepprocessor';
import { ProvisioningStepInput, ProvisioningStepOutput } from './provisioningstep.model';
import { logger } from '../../utils/logger';
import { TYPES } from '../../di/types';
import AWS = require('aws-sdk');
import * as pem from 'pem';
import ow from 'ow';

@injectable()
export class CreateDeviceCertificateStepProcessor implements ProvisioningStepProcessor {

  private _iot: AWS.Iot;
  private _ssm: AWS.SSM;

  public constructor(
    @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
    @inject('deviceCertificateExpiryDays') private certificateExpiryDays: number) {

      this._iot = iotFactory();
      this._ssm = ssmFactory();
  }

    public async process(stepInput: ProvisioningStepInput): Promise<ProvisioningStepOutput> {
        logger.debug(`CreateDeviceCertificateStepProcessor: process: in: stepInput: ${JSON.stringify(stepInput)}`);

        if (stepInput.cdfProvisioningParameters === null || stepInput.cdfProvisioningParameters === undefined) {
            throw new Error('REGISTRATION_FAILED: template called for creation of certificate but cdfProvisioningParameters were not supplied');
        }

        if (stepInput.cdfProvisioningParameters.certInfo === null || stepInput.cdfProvisioningParameters.certInfo === undefined) {
            throw new Error('REGISTRATION_FAILED: template called for creation of certificate but certificate information was not not supplied');
        }

        ow(stepInput.cdfProvisioningParameters.caId, ow.string.nonEmpty);

        const output: ProvisioningStepOutput = {
            parameters: stepInput.parameters,
            cdfProvisioningParameters: stepInput.cdfProvisioningParameters
        };

        const futures:Promise<string>[] = [
            this.getCaPem(stepInput.cdfProvisioningParameters.caId),
            this.getCaPrivateKey(stepInput.cdfProvisioningParameters.caId),
            this.createPrivateKey()
        ];

        const results = await Promise.all(futures);
        const caPem = results[0];
        const caKey = results[1];
        const privateKey = results[2];

        const csr = await this.createCSR(privateKey, stepInput.cdfProvisioningParameters.certInfo);
        const certificate = await this.createCertificate(csr, caKey, caPem);

        output.parameters.CaCertificatePem = caPem;
        output.parameters.CertificatePem = certificate;
        output.cdfProvisioningParameters.privateKey = privateKey;

        logger.debug('CreateDeviceCertificateStepProcessor: process: exit: REDACTED');
        return output;
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

    private createPrivateKey() : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: createPrivateKey: in:`);
        return new Promise((resolve:any,reject:any) =>  {
            pem.createPrivateKey(2048, (err:any, data:any) => {
                if(err) {
                    logger.debug(`CreateDeviceCertificateStepProcessor: createPrivateKey: err:${err}`);
                    return reject(err);
                }
                logger.debug('CreateDeviceCertificateStepProcessor: createPrivateKey: exit: REDACTED');
                return resolve(data.key);
            });
        });
    }

    // generate certificate signing request
    private createCSR(privateKey:string, certInfo: {[key:string]:string}) : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: createCSR: in: privateKey: REDACTED, certInfo:${JSON.stringify(certInfo)}`);
        return new Promise((resolve:any,reject:any) =>  {
            const csrOptions: pem.CSRCreationOptions = {
                commonName: certInfo.commonName,
                organization: certInfo.organization,
                organizationUnit: certInfo.organizationalUnit,
                locality: certInfo.locality,
                state: certInfo.stateName,
                country: certInfo.country,
                emailAddress: certInfo.emailAddress,
                clientKey:privateKey
            };
            pem.createCSR(csrOptions, (err:Object, data:any) => {
                if(err) {
                    logger.debug(`CreateDeviceCertificateStepProcessor: createCSR: err:${JSON.stringify(err)}`);
                    return reject(err);
                }
                logger.debug(`CreateDeviceCertificateStepProcessor: createCSR: exit:${JSON.stringify(data.csr)}`);
                return resolve(data.csr);
            });
        });
    }

    private createCertificate(csr:string, rootKey:string, rootPem:string) : Promise<string> {
        logger.debug(`CreateDeviceCertificateStepProcessor: createCertificate: in: csr:${csr}, rootKey:${rootKey}, rootPem:${rootPem}`);
        return new Promise((resolve:any,reject:any) =>  {
            pem.createCertificate({csr, days: this.certificateExpiryDays, serviceKey:rootKey, serviceCertificate:rootPem}, (err:any, data:any) => {
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
