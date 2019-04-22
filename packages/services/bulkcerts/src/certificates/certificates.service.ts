/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import * as pem from 'pem';
import AWS = require('aws-sdk');
import { TYPES } from '../di/types';
import JSZip from 'jszip';
import {v1 as uuid} from 'uuid';
import * as fs from 'fs';
import { promisify } from 'util';
import config from 'config';
import ow from 'ow';
import { CertificatesTaskDao } from './certificatestask.dao';
import { CertificateChunkRequest, CertificateInfo } from './certificates.models';

@injectable()
export class CertificatesService {

    private _iot: AWS.Iot;
    private _s3: AWS.S3;
    private _ssm: AWS.SSM;

    private _writeFileAsync = promisify(fs.writeFile);

    public constructor(
            @inject(TYPES.CertificatesTaskDao) private taskDao: CertificatesTaskDao,
            @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
            @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
            @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
            @inject('aws.s3.certificates.bucket') private certificatesBucket: string,
            @inject('aws.s3.certificates.prefix') private certificatesPrefix: string,
            @inject('deviceCertificateExpiryDays') private certificateExpiryDays: number) {
        this._iot = iotFactory();
        this._s3  =  s3Factory();
        this._ssm = ssmFactory();
    }

    public async createChunk(req: CertificateChunkRequest) : Promise<void> {
        logger.debug(`certificates.service createChunk: in: req: ${JSON.stringify(req)}`);

        ow(req.taskId, ow.string.nonEmpty);
        ow(req.chunkId, ow.number.greaterThan(0));
        ow(req.quantity, ow.number.greaterThan(0));
        ow(req.certInfo, ow.object.nonEmpty);
        ow(req.caAlias, ow.string.nonEmpty);

        const rootCACertId:string = config.get(`supplierRootCa.${req.caAlias}`) as string;
        logger.debug(`rootCACertId: ${rootCACertId}`);

        let certsZip:JSZip;

        if (rootCACertId === 'AwsIotDefault') {
            certsZip = await this.createChunkWithAwsIotCa(req.quantity, req.certInfo);
        } else {
            certsZip = await this.createChunkWithCustomerCa(req.quantity, rootCACertId, req.certInfo);
        }

        const s3Prefix = `${req.taskId}/${req.chunkId}/`;

        // upload zip to S3
        const zipStream = certsZip.generateNodeStream({type: 'nodebuffer', streamFiles:true});
        await this.uploadStreamToS3(this.certificatesBucket, `${this.certificatesPrefix}${s3Prefix}certs.zip`, zipStream);

        // update chunk
        await this.taskDao.updateTaskChunkLocation(req.taskId, req.chunkId, `s3://${this.certificatesBucket}/${this.certificatesPrefix}${s3Prefix}certs.zip`);

        logger.debug('certificates.service createChunk: exit:');
    }

    private async createChunkWithCustomerCa(quantity: number, caId:string, certInfo: CertificateInfo): Promise<JSZip> {
        logger.debug(`certificates.service createChunkWithCustomerCa: in: quantity: ${quantity}, caId: ${caId}, certInfo: ${JSON.stringify(certInfo)}`);

        const jszip = new JSZip();
        const certsZip = jszip.folder('certs');

        const [rootPem, rootKey] = await Promise.all([this.getRootCAPem(caId), this.getRootCAKey(caId)]);

        for (let i=0; i<quantity; ++i) {
            const privateKey = await this.createPrivateKey();
            const csr = await this.createCSR(privateKey, certInfo);
            const certificate = await this.createCertificate(csr, rootKey, rootPem);
            const certId = await this.getCertFingerprint(certificate);

            certsZip.file(`${certId}_cert.pem`, certificate);
            certsZip.file(`${certId}_key.pem`, privateKey);
        }
        return certsZip;
    }

    private async createChunkWithAwsIotCa(quantity: number, certInfo: CertificateInfo): Promise<JSZip> {
        logger.debug(`certificates.service createChunkWithAwsIotCa: in: quantity: ${quantity}, certInfo: ${JSON.stringify(certInfo)}`);

        const jszip = new JSZip();
        const certsZip = jszip.folder('certs');

        for (let i=0; i<quantity; ++i) {
            const privateKey = await this.createPrivateKey();
            const csr = await this.createCSR(privateKey, certInfo);

            const certificateResponse: AWS.Iot.CreateCertificateFromCsrResponse = await this.getAwsIotCertificate(csr);

            const certificate = certificateResponse.certificatePem;
            const certId = certificateResponse.certificateId;

            certsZip.file(`${certId}_cert.pem`, certificate);
            certsZip.file(`${certId}_key.pem`, privateKey);
        }
        return certsZip;
    }

    public async getCertificates(taskId:string) : Promise<string> {
        logger.debug(`certificates.service getCertificates: in: taskId: ${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        // check DynamoDB to ensure task is complete and loop through chunks
        // and get the s3 location for each chunk
        const locations:string[] = await this.taskDao.getTaskLocations(taskId);
        if (locations === undefined || locations.length===0) {
            throw new Error('NOT_FOUND');
        }

        // combine smaller zips into one zip file to be returned
        const finalZipLocation:string = await this.createZipFromZips(locations);
        logger.debug(`bulkcertificates.service getBulkCertificates: finalZipLocation: ${finalZipLocation}`);
        return finalZipLocation;
    }

    private async createZipFromZips(locations:string[]) : Promise<string> {
        logger.debug(`certificates.service createZipFromZips: in: locations: ${locations}`);
        ow(locations, ow.array.nonEmpty.minLength(1));

        const zipfile = new JSZip();

        for (const location of locations) {
            const zipData = await this.getS3File(location);
            await zipfile.loadAsync(zipData);
        }

        const zipFilePath:string = await this.writeTempZipfile(zipfile);

        logger.debug(`certificates.service createZipFromZips: exit: ${zipFilePath}`);
        return zipFilePath;
    }

    private async getS3File(location:string) : Promise<Buffer> {
        logger.debug(`certificates.service getS3File: in: location:${location}`);
        ow(location, ow.string.nonEmpty);

        // s3://cdf-157731826412-us-west-2-dev-certificate-ems/8bc077a0-83a1-11e8-95b9-3d40d65219a2/certs.zip
        const bucket:string = location.split('/')[2];
        const key:string = location.substring(bucket.length + 's3://'.length + '/'.length);

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

    private async writeTempZipfile(zipfile:JSZip): Promise<string> {
        logger.debug('certificates.service writeTempZipfile: in:');

        ow(zipfile, ow.object.nonEmpty);

        // create unique name on disk
        const fileNameAndPath = `/tmp/${uuid()}.zip`;

        const buf = await zipfile.generateAsync({type:'nodebuffer'});
        await this._writeFileAsync(fileNameAndPath, buf);

        logger.debug(`certificates.service writeTempZipfile: exit:${fileNameAndPath}`);
        return fileNameAndPath;
    }

    public async deleteBatch(taskId:string) : Promise<boolean> {
        logger.debug(`certificates.service deleteBatch: in: taskId: ${taskId}`);

        const deleteResponse = await this.deleteCertificates(taskId);
        logger.debug(`certificates.service deleteBatch: exit: response: ${JSON.stringify(deleteResponse)}`);
        return true;
    }

    // generate device public/private keys
    private createPrivateKey() : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.createPrivateKey(2048, (err:any, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.key);
            });
        });
    }

    // generate certificate signing request
    private createCSR(privateKey:string, certInfo: CertificateInfo) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            const csrOptions= {
                country: certInfo.country,
                organization: certInfo.organization,
                organizationUnit: certInfo.organizationalUnit,
                state: certInfo.stateName,
                commonName: certInfo.commonName,
                clientKey:privateKey
            };
            pem.createCSR(csrOptions, (err:Object, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.csr);
            });
        });
    }

    private createCertificate(csr:string, rootKey:string, rootPem:string) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.createCertificate({csr, days:this.certificateExpiryDays, serviceKey:rootKey, serviceCertificate:rootPem}, (err:any, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.certificate);
            });
        });
    }

    private getCertFingerprint(certificate:string) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.getFingerprint(certificate, (err:any, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.fingerprint.replace(/:/g, '').toLowerCase());
            });
        });
    }

    private async getRootCAKey(rootCACertId:string) : Promise<string> {
        const params = {
            Name: `cdf-ca-key-${rootCACertId}`,
            WithDecryption: true
        };

        const data = await this._ssm.getParameter(params).promise();
        return data.Parameter.Value;
    }

    private async getRootCAPem (rootCACertId:string) : Promise<string> {
        const params = {
            certificateId: rootCACertId
        };
        const data = await this._iot.describeCACertificate(params).promise();
        return data.certificateDescription.certificatePem;
    }

    private async getAwsIotCertificate(csr: string) : Promise<AWS.Iot.CreateCertificateFromCsrResponse> {
        const params: AWS.Iot.CreateCertificateFromCsrRequest = {
            certificateSigningRequest: csr,
            setAsActive: false
        };
        const data: AWS.Iot.CreateCertificateFromCsrResponse = await this._iot.createCertificateFromCsr(params).promise();
        return data;
    }

    private uploadStreamToS3(bucket:string, key:string, body:NodeJS.ReadableStream) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            const params = {
                Bucket: bucket,
                Key: key,
                Body: body
            };
            this._s3.upload(params, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                const eTag = data.ETag;

                return resolve(eTag);
            });
        });
    }

    private async deleteCertificates(taskId:string) : Promise<void> {

        // list objects in batch
        const getParams = {
            Bucket: this.certificatesBucket,
            Prefix: `${this.certificatesPrefix}${taskId}`
        };
        const data = await this._s3.listObjectsV2(getParams).promise();

        const deleteObjects:any = [];
        for (const certObject of data.Contents) {
            deleteObjects.push({Key:certObject.Key});
        }

        const deleteParams = {
            Bucket: this.certificatesBucket,
            Delete: {
                Objects: deleteObjects
            }
        };

        await this._s3.deleteObjects(deleteParams).promise();
    }
}
