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
 import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import JSZip from 'jszip';
import ow from 'ow';
import * as pem from 'pem';
import { promisify } from 'util';
import { v1 as uuid } from 'uuid';
import pLimit from 'p-limit';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { ACMCertificate, CertificateChunkRequest, CertificateInfo, CommonName } from './certificates.models';
import { CertificatesTaskDao } from './certificatestask.dao';

import AWS = require('aws-sdk');
@injectable()
export class CertificatesService {

    private _iot: AWS.Iot;
    private _s3: AWS.S3;
    private _ssm: AWS.SSM;
    private _acmpca: AWS.ACMPCA;
    private _defaultAcmConcurrencyLimit=5;

    private _writeFileAsync = promisify(fs.writeFile);

    public constructor(
        @inject(TYPES.CertificatesTaskDao) private taskDao: CertificatesTaskDao,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.ACMPCAFactory) acmpcaFactory: () => AWS.ACMPCA,
        @inject('aws.s3.certificates.bucket') private certificatesBucket: string,
        @inject('aws.s3.certificates.prefix') private certificatesPrefix: string,
        @inject('defaults.chunkSize') private defaultChunkSize: number,
        @inject('deviceCertificateExpiryDays') private defaultDaysExpiry: number,
        @inject('aws.acm.concurrency.limit') private acmConcurrencyLimit: number) {
        this._iot = iotFactory();
        this._s3 = s3Factory();
        this._ssm = ssmFactory();
        this._acmpca = acmpcaFactory();
    }

    public async createChunk(req: CertificateChunkRequest): Promise<void> {
        logger.debug(`certificates.service createChunk: in: req: ${JSON.stringify(req)}`);

        ow(req.taskId, ow.string.nonEmpty);
        ow(req.chunkId, ow.number.greaterThan(0));
        ow(req.quantity, ow.number.greaterThan(0));
        ow(req.certInfo, ow.object.nonEmpty);
        ow(req.caAlias, ow.string.nonEmpty);

        const caEnvVarName = `SUPPLIER_CA_${req.caAlias.toUpperCase()}`;
        const rootCACertId: string = process.env[caEnvVarName];

        logger.debug(`certificates.service createChunk: rootCACertId: ${rootCACertId}`);

        let certsZip: JSZip;

        if (rootCACertId === 'AwsIotDefault') {
            certsZip = await this.createChunkWithAwsIotCa(req.quantity, req.certInfo , req.chunkId);
        } else if (rootCACertId.startsWith('arn:aws:acm-pca:')) {
            certsZip = await this.createChunkWithAcm(req.quantity, req.certInfo,  rootCACertId, req.chunkId);
        } else {
            certsZip = await this.createChunkWithCustomerCa(req.quantity, rootCACertId, req.certInfo, req.chunkId);
        }

        const s3Prefix = `${req.taskId}/${req.chunkId}/`;

        // upload zip to S3
        const zipStream = certsZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true });
        await this.uploadStreamToS3(this.certificatesBucket, `${this.certificatesPrefix}${s3Prefix}certs.zip`, zipStream);

        // update chunk
        await this.taskDao.updateTaskChunkLocation(req.taskId, req.chunkId, `s3://${this.certificatesBucket}/${this.certificatesPrefix}${s3Prefix}certs.zip`);

        logger.debug('certificates.service createChunk: exit:');
    }

    private async createChunkWithCustomerCa(quantity: number, caId: string, certInfo: CertificateInfo, chunkId: number): Promise<JSZip> {
        logger.debug(`certificates.service createChunkWithCustomerCa: in: quantity: ${quantity}, caId: ${caId}, certInfo: ${JSON.stringify(certInfo)}, chunkId: ${chunkId}`);

        const jszip = new JSZip();
        const certsZip = jszip.folder('certs');

        const [rootPem, rootKey] = await Promise.all([this.getRootCAPem(caId), this.getRootCAKey(caId)]);
        const certificateMappings = {};
        const chunkStart = (chunkId - 1) * this.defaultChunkSize;
        const chunkEnd = ((chunkId - 1) * this.defaultChunkSize) + quantity;

        for (let i = chunkStart; i < chunkEnd; ++i) {
            const deviceCertInfo: CertificateInfo = Object.assign({}, certInfo);
            const privateKey = await this.createPrivateKey();
            const commonName = await this.createCommonName(deviceCertInfo.commonName, i);
            deviceCertInfo.commonName = commonName;
            const csr = await this.createCSR(privateKey, deviceCertInfo);
            const certificate = await this.createCertificate(csr, deviceCertInfo.daysExpiry ?? this.defaultDaysExpiry, rootKey, rootPem);
            const certId = await this.getCertFingerprint(certificate);

            if (certInfo.includeCA) { // include rootCA in device certificate
                certsZip.file(`${certId}_cert.pem`, `${certificate}\n${rootPem}`);
            } else {
                certsZip.file(`${certId}_cert.pem`, certificate);
            }

            certsZip.file(`${certId}_key.pem`, privateKey);
            certificateMappings[commonName] = certId;
        }
        certsZip.file(`certificate_manifest.json`, JSON.stringify(certificateMappings));
        return certsZip;
    }

    private async createChunkWithAwsIotCa(quantity: number, certInfo: CertificateInfo, chunkId: number ): Promise<JSZip> {
        logger.debug(`certificates.service createChunkWithAwsIotCa: in: quantity: ${quantity}, certInfo: ${JSON.stringify(certInfo)} , chunkId: ${chunkId}`);

        const jszip = new JSZip();
        const certsZip = jszip.folder('certs');

        
        const chunkStart = (chunkId - 1) * this.defaultChunkSize;
        const chunkEnd = ((chunkId - 1) * this.defaultChunkSize) + quantity;

        for (let i = chunkStart; i < chunkEnd; ++i) {
            const privateKey = await this.createPrivateKey();
            certInfo.commonName = await this.createCommonName(certInfo.commonName, i);
            const csr = await this.createCSR(privateKey, certInfo);

            const certificateResponse: AWS.Iot.CreateCertificateFromCsrResponse = await this.getAwsIotCertificate(csr);

            const certificate = certificateResponse.certificatePem;
            const certId = certificateResponse.certificateId;

            certsZip.file(`${certId}_cert.pem`, certificate);
            certsZip.file(`${certId}_key.pem`, privateKey);
        }
        return certsZip;
    }

    private async createChunkWithAcm(quantity: number, certInfo: CertificateInfo, caArn: string, chunkId: number): Promise<JSZip> {
        logger.info(`certificates.service createChunkWithACM: in: quantity: ${quantity}, certInfo: ${JSON.stringify(certInfo)}, caArn: ${caArn}, chunkId: ${chunkId}, ACM Concurrency Limit:${this.acmConcurrencyLimit}`);

        const jszip = new JSZip();
        const certsZip = jszip.folder('certs');
        const promises: Promise<ACMCertificate>[] = [];

        const chunkStart = (chunkId - 1) * this.defaultChunkSize;
        const chunkEnd = ((chunkId - 1) * this.defaultChunkSize) + quantity;
        
        const limit = pLimit(this.acmConcurrencyLimit ?? this._defaultAcmConcurrencyLimit);
        
        for (let i = chunkStart; i < chunkEnd; ++i) {
            promises.push(
                limit(async () => {
                    const response = await this.createCertificateWithAcm(i,certInfo,caArn);
                    return response;
                })
            );
        }

        const results = await Promise.all(promises);
        
        for(const result of results){
            certsZip.file(`${result.certificateArn}_cert.pem`, result.certificate);
            certsZip.file(`${result.certificateArn}_key.pem`, result.privateKey);
        }

        return certsZip;
    }

    private async createCertificateWithAcm(index:number,certInfo: CertificateInfo,caArn: string): Promise<ACMCertificate> {
        const privateKey = await this.createPrivateKey();
        certInfo.commonName = await this.createCommonName(certInfo.commonName, index);
        const csr = await this.createCSR(privateKey, certInfo);

        const certificateResponse:ACMCertificate  = await this.getACMCertificate(csr, certInfo, caArn);
        certificateResponse.privateKey = privateKey

        return certificateResponse;

    }

    public async getCertificates(taskId: string, downloadType: string): Promise<string | string[]> {
        logger.debug(`certificates.service getCertificates: in: taskId: ${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        // check DynamoDB to ensure task is complete and loop through chunks
        // and get the s3 location for each chunk
        const locations: string[] = await this.taskDao.getTaskLocations(taskId);
        if (locations === undefined || locations.length === 0) {
            throw new Error('NOT_FOUND');
        }

        if (typeof downloadType !== 'undefined' && downloadType === 'signedUrl') {
            const signedURLs: string[] = await this.getS3SignedUrl(locations);
            logger.debug(`bulkcertificates.service getBulkCertificates: signedURLs: ${signedURLs}`);
            return signedURLs;
        } else {
            // combine smaller zips into one zip file to be returned
            const finalZipLocation: string = await this.createZipFromZips(locations);
            logger.debug(`bulkcertificates.service getBulkCertificates: finalZipLocation: ${finalZipLocation}`);
            return finalZipLocation;
        }
    }

    private async createZipFromZips(locations: string[]): Promise<string> {
        logger.debug(`certificates.service createZipFromZips: in: locations: ${locations}`);
        ow(locations, ow.array.nonEmpty.minLength(1));

        const zipfile = new JSZip();

        for (const location of locations) {
            const zipData = await this.getS3File(location);
            await zipfile.loadAsync(zipData);
        }

        const zipFilePath: string = await this.writeTempZipfile(zipfile);

        logger.debug(`certificates.service createZipFromZips: exit: ${zipFilePath}`);
        return zipFilePath;
    }

    private async getS3File(location: string): Promise<Buffer> {
        logger.debug(`certificates.service getS3File: in: location:${location}`);
        ow(location, ow.string.nonEmpty);

        // s3://cdf-xxxxxxxxxxxx-us-west-2-dev-certificate-ems/8bc077a0-83a1-11e8-95b9-3d40d65219a2/certs.zip
        const bucket: string = location.split('/')[2];
        const key: string = location.substring(bucket.length + 's3://'.length + '/'.length);

        const params = {
            Bucket: bucket,
            Key: key
        };

        try {
            const data = await this._s3.getObject(params).promise();
            return data.Body as Buffer;
        } catch (err) {
            if (err.code === 'NoSuchKey') {
                return undefined;
            } else {
                throw err;
            }
        }
    }

    private async getS3SignedUrl(locations: string[]): Promise<string[]> {
        logger.debug(`certificates.service getS3File: in: locations:${locations}`);
        ow(locations, ow.array.nonEmpty);

        try {
            const signedUrls: string[] = [];
            for (const location of locations) {
                const bucket: string = location.split('/')[2];
                const key: string = location.substring(bucket.length + 's3://'.length + '/'.length);

                const params = {
                    Bucket: bucket,
                    Key: key,
                    Expires: 3600
                };
                const url = await this._s3.getSignedUrl('getObject', params);
                signedUrls.push(url);
            }
            return signedUrls;
        } catch (err) {
            if (err.code === 'NoSuchKey') {
                return undefined;
            } else {
                throw err;
            }
        }
    }

    private async writeTempZipfile(zipfile: JSZip): Promise<string> {
        logger.debug('certificates.service writeTempZipfile: in:');

        ow(zipfile, ow.object.nonEmpty);

        // create unique name on disk
        const fileNameAndPath = `/tmp/${uuid()}.zip`;

        const buf = await zipfile.generateAsync({ type: 'nodebuffer' });
        await this._writeFileAsync(fileNameAndPath, buf);

        logger.debug(`certificates.service writeTempZipfile: exit:${fileNameAndPath}`);
        return fileNameAndPath;
    }

    public async deleteBatch(taskId: string): Promise<boolean> {
        logger.debug(`certificates.service deleteBatch: in: taskId: ${taskId}`);

        const deleteResponse = await this.deleteCertificates(taskId);
        logger.debug(`certificates.service deleteBatch: exit: response: ${JSON.stringify(deleteResponse)}`);
        return true;
    }

    // generate device public/private keys
    private createPrivateKey(): Promise<string> {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve: any, reject: any) => {
            pem.createPrivateKey(2048, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data['key']);
            });
        });
    }

    // generate certificate signing request
    private createCSR(privateKey: string, certInfo: CertificateInfo): Promise<string> {
        return new Promise((resolve: any, reject: any) => {
            // Coverting commonName to base64
            const commonName = Buffer.from(certInfo.commonName.toString()).toString('base64');
            const csrOptions = {
                country: certInfo.country,
                organization: certInfo.organization,
                organizationUnit: certInfo.organizationalUnit,
                state: certInfo.stateName,
                commonName,
                clientKey: privateKey
            };
            pem.createCSR(csrOptions, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.csr);
            });
        });
    }

    private createCertificate(csr: string, days: number, rootKey: string, rootPem: string): Promise<string> {
        return new Promise((resolve: any, reject: any) => {
            pem.createCertificate({ csr, days, serviceKey: rootKey, serviceCertificate: rootPem }, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.certificate);
            });
        });
    }

    private getCertFingerprint(certificate: string): Promise<string> {
        return new Promise((resolve: any, reject: any) => {
            pem.getFingerprint(certificate, 'sha256', (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.fingerprint.replace(/:/g, '').toLowerCase());
            });
        });
    }

    private async getRootCAKey(rootCACertId: string): Promise<string> {
            const params = {
                Name: `cdf-ca-key-${rootCACertId}`,
                WithDecryption: true
            };
            const data = await this._ssm.getParameter(params).promise();
            const certificate = data.Parameter.Value;
        return certificate;
    }

    private async getRootCAPem(rootCACertId: string): Promise<string> {
        const params = {
            certificateId: rootCACertId
        };
        const data = await this._iot.describeCACertificate(params).promise();
        return data.certificateDescription.certificatePem;
    }

    private async getAwsIotCertificate(csr: string): Promise<AWS.Iot.CreateCertificateFromCsrResponse> {
        const params: AWS.Iot.CreateCertificateFromCsrRequest = {
            certificateSigningRequest: csr,
            setAsActive: false
        };
        const data: AWS.Iot.CreateCertificateFromCsrResponse = await this._iot.createCertificateFromCsr(params).promise();
        return data;
    }

    private async getACMCertificate(csr: string, certInfo: CertificateInfo, caArn: string): Promise<ACMCertificate> {
        
        const params: AWS.ACMPCA.IssueCertificateRequest = {
            Csr: csr,
            CertificateAuthorityArn: caArn,
            SigningAlgorithm: "SHA256WITHRSA",
            Validity: { Value: certInfo.daysExpiry ?? this.defaultDaysExpiry, Type: "DAYS" }
        };

        if (certInfo?.country && certInfo?.organization  && certInfo?.organizationalUnit && certInfo?.stateName  && certInfo?.commonName ){
            const apiPassthrough:AWS.ACMPCA.ApiPassthrough = {
                Subject: {
                    Country: certInfo.country,
                    Organization: certInfo.organization,
                    OrganizationalUnit: certInfo.organizationalUnit,
                    State: certInfo.stateName,
                    CommonName: certInfo.commonName.toString()
                }
            };
            params.ApiPassthrough = apiPassthrough
        }
        
        
        const data: AWS.ACMPCA.IssueCertificateResponse = await this._acmpca.issueCertificate(params).promise();
        let cert: AWS.ACMPCA.GetCertificateResponse;
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try{
                cert =  await this._acmpca.getCertificate({ CertificateAuthorityArn: caArn ,CertificateArn: data.CertificateArn }).promise();
                break;
            } catch(err){
                if(err.code == "RequestInProgressException" ||err.code =="ThrottlingException"){
                    // Need to factor in the time ACMPCA takes to issue the certificate using the retyDelay returned in the error payload
                    await this.sleep(err.retryDelay); 
                    continue
                } else{
                    break;
                }
            }
        }
            
        return {certificateArn: data.CertificateArn, certificate: `${cert.Certificate}\n${cert.CertificateChain}`};
    }

    private async uploadStreamToS3(bucket: string, key: string, body: NodeJS.ReadableStream): Promise<string> {
        const params = {
            Bucket: bucket,
            Key: key,
            Body: body
        };
        const data = await this._s3.upload(params).promise();
        return data.ETag
    }

    private async deleteCertificates(taskId: string): Promise<void> {

        // list objects in batch
        const getParams = {
            Bucket: this.certificatesBucket,
            Prefix: `${this.certificatesPrefix}${taskId}`
        };
        const data = await this._s3.listObjectsV2(getParams).promise();

        const deleteObjects: any = [];
        for (const certObject of data.Contents) {
            deleteObjects.push({ Key: certObject.Key });
        }

        const deleteParams = {
            Bucket: this.certificatesBucket,
            Delete: {
                Objects: deleteObjects
            }
        };

        await this._s3.deleteObjects(deleteParams).promise();
    }

    private async createCommonName(commonName: CommonName | string, count: number): Promise<string> {
        let commonNameValue: string;
        if (typeof commonName === 'object') {
            if (typeof commonName.prefix === 'undefined') {
                commonName.prefix = '';
            }
            if (commonName.generator === 'increment') {
                commonNameValue = commonName.prefix + (parseInt(commonName.commonNameStart, 16) + count).toString(16).toUpperCase();
            } else if (commonName.generator === 'list') {
                commonNameValue = commonName.prefix + commonName.commonNameList[count].toUpperCase();
            } else if (commonName.generator === 'static') {
                commonNameValue = commonName.prefix + commonName.commonNameStatic.toUpperCase();
            }
        } else {
            commonNameValue = commonName;
        }
        return commonNameValue;
    }

    private async sleep(time: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.debug(`sleeping for: ${time}ms`);
                clearTimeout(timeout);
                resolve(undefined);
            }, time);
        }).then(() => {
            return;
        });
    }
}
