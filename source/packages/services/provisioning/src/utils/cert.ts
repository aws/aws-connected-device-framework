import { inject, injectable } from 'inversify';
import { CertificateStatus, CertInfo } from "../things/things.models";
import { logger } from '@awssolutions/simple-cdf-logger';
import * as pem from 'pem';
import { TYPES } from '../di/types';
import { DescribeCACertificateRequest, DescribeCACertificateResponse, RegisterCertificateWithoutCAResponse } from 'aws-sdk/clients/iot';
import ow from 'ow';

@injectable()
export class CertUtils {

    private _iot: AWS.Iot;


    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        this._iot = iotFactory();
    }

    public createPrivateKey(): Promise<string> {
        logger.debug(`CertUtils: createPrivateKey: in:`);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve: any, reject: any) => {
            pem.createPrivateKey(2048, (err: any, data: any) => {
                if (err) {
                    logger.debug(`CertUtils: createPrivateKey: err:${err}`);
                    return reject(err);
                }
                logger.debug('CertUtils: createPrivateKey: exit: REDACTED');
                return resolve(data.key);
            });
        });
    }

    // generate certificate signing request
    public createCSR(privateKey: string, certInfo: CertInfo): Promise<string> {
        logger.debug(`CertUtils: createCSR: in: privateKey: REDACTED, certInfo:${JSON.stringify(certInfo)}`);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve: any, reject: any) => {
            const csrOptions: pem.CSRCreationOptions = {
                commonName: certInfo.commonName,
                organization: certInfo.organization,
                organizationUnit: certInfo.organizationalUnit,
                locality: certInfo.locality,
                state: certInfo.stateName,
                country: certInfo.country,
                emailAddress: certInfo.emailAddress,
                clientKey: privateKey
            };
            pem.createCSR(csrOptions, (err: any, data: any) => {
                if (err) {
                    logger.debug(`CertUtils: createCSR: err:${JSON.stringify(err)}`);
                    return reject(err);
                }
                logger.debug(`CertUtils: createCSR: exit:${JSON.stringify(data.csr)}`);
                return resolve(data.csr);
            });
        });
    }

    public async registerCertificateWithoutCA(certificatePem: string, status: CertificateStatus): Promise<RegisterCertificateWithoutCAResponse> {
        logger.debug(`CertUtils: registerCertificateWithoutCA: in: ${certificatePem}`);

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

        return result;
    }

    public async getCaCertificate(caCertificateArn:string) : Promise<string> {
        logger.debug(`CertUtils getCaCertificate: in: caCertificateArn:${caCertificateArn}`);
        ow(caCertificateArn, ow.string.nonEmpty);

        const certificateId = caCertificateArn.split('/')[1]

        const params: DescribeCACertificateRequest = {
            certificateId
        };

        let caCertificatePem:string;
        try {
            const response:DescribeCACertificateResponse = await this._iot.describeCACertificate(params).promise();
            caCertificatePem = response.certificateDescription.certificatePem;
        } catch (err) {
            logger.debug(`CertUtils getCaCertificate: err:${err}`);
            throw new Error('UNABLE_TO_GET_CA_CERTIFICATE');
        }

        logger.debug('CertUtils getCaCertificate: exit:');
        return caCertificatePem;
    }

}