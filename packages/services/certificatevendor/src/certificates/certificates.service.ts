/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import ow from 'ow';
import { Iot } from 'aws-sdk';
import { CertificateResponseModel } from './certificates.models';
import { UpdateCertificateRequest } from 'aws-sdk/clients/iot';
import { RegistryManager } from '../registry/registry.interfaces';

@injectable()
export class CertificateService {

    private iot: AWS.Iot;
    private iotData: AWS.IotData;
    private s3: AWS.S3;

    constructor(
        @inject('aws.s3.certificates.bucket') private s3Bucket: string,
        @inject('aws.s3.certificates.prefix') private s3Prefix: string,
        @inject('aws.s3.certificates.suffix') private s3Suffix: string,
        @inject('aws.s3.certificates.presignedUrlExpiresInSeconds') private presignedUrlExpiresInSeconds: number,
        @inject('mqtt.topics.get.success') private mqttGetSuccessTopic: string,
        @inject('mqtt.topics.get.failure') private mqttGetFailureTopic: string,
        @inject('mqtt.topics.ack.success') private mqttAckSuccessTopic: string,
        @inject('mqtt.topics.ack.failure') private mqttAckFailureTopic: string,
        @inject('aws.iot.thingGroup.rotateCertificates') private thingGroupName: string,
        @inject(TYPES.RegistryManager) private registry:RegistryManager,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3 ) {
            this.iot = iotFactory();
            this.iotData = iotDataFactory();
            this.s3 = s3Factory();
    }

    public async get(deviceId:string): Promise<void> {
        logger.debug(`certificates.service get: in: deviceId:${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        const response:CertificateResponseModel = {};

        try {

            // ensure device is whitelisted
            if (await this.registry.isWhitelisted(deviceId)!==true) {
                throw new Error('DEVICE_NOT_WHITELISTED');
            }

            // obtain certificateId of certificate to activate
            const key = `${this.s3Prefix}${deviceId}${this.s3Suffix}`;
            const certificateId = await this.getCertificateId(this.s3Bucket, key);

            // activate the certificate
            await this.activateCertificate(certificateId);

            // generate presigned urls
            const presignedUrl = this.generatePresignedUrl(this.s3Bucket, key, this.presignedUrlExpiresInSeconds);

            // update asset library status
            await this.registry.updateAssetStatus(deviceId);

            // send success to the device
            response.location = presignedUrl;
            await this.publishResponse(this.mqttGetSuccessTopic, deviceId, response);

        } catch (err) {
            logger.error(`certificates.service get error:${err}`);
            response.message = err.message;
            await this.publishResponse(this.mqttGetFailureTopic, deviceId, response);
            throw err;
        }

        logger.debug(`certificates.service get exit: response:${JSON.stringify(response)}`);

    }

    public async ack(deviceId:string): Promise<void> {
        logger.debug(`certificates.service ack: in: deviceId:${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

        const response:CertificateResponseModel = {};

        try {

            // ensure device is whitelisted
            if (await this.registry.isWhitelisted(deviceId)!==true) {
                throw new Error('DEVICE_NOT_WHITELISTED');
            }

            // remove the device from the group of devices to process
            const params:Iot.Types.RemoveThingFromThingGroupRequest = {
                thingName: deviceId,
                thingGroupName: this.thingGroupName
            };
            await this.iot.removeThingFromThingGroup(params).promise();

            // send success to the device
            response.message = 'OK';
            await this.publishResponse(this.mqttAckSuccessTopic, deviceId, response);

        } catch (err) {
            logger.error(`certificates.service ack: error:${err}`);
            response.message = err.message;
            await this.publishResponse(this.mqttAckFailureTopic, deviceId, response);
            throw err;
        }

        logger.debug(`certificates.service ack exit: response:${JSON.stringify(response)}`);
    }

    private async getCertificateId(bucketName:string, key:string) : Promise<string> {
        logger.debug(`certificates.service getCertificateId: in: bucketName:${bucketName}, key:${key}`);
        const params = {
            Bucket: bucketName,
            Key: key

        };

        let certificateId:string;
        try {
            const head = await this.s3.headObject(params).promise();
            logger.debug(`certificates.service getCertificateId: head:${JSON.stringify(head)}`);

            if (head.Metadata===undefined || head.Metadata['certificateid']===undefined) {
                logger.warn('certificates.service getCertificateid: exit: MISSING_CERTIFICATE_ID');
                throw new Error('MISSING_CERTIFICATE_ID');
            }

            certificateId = head.Metadata['certificateid'];
        } catch (err) {
            logger.debug(`certificates.service getCertificateId: err:${err}`);
            if (err.message==='MISSING_CERTIFICATE_ID') {
                throw err;
            } else {
                throw new Error('CERTIFICATE_NOT_FOUND');
            }
        }

        logger.debug(`certificates.service getCertificateId: exit: certificateId:${certificateId}`);
        return certificateId;
    }

    private async activateCertificate(certificateId:string) : Promise<void> {
        logger.debug(`certificates.service activateCertificate: in: certificateId:${certificateId}`);
        const params: UpdateCertificateRequest = {
            certificateId,
            newStatus: 'ACTIVE'
        };

        try {
            await this.iot.updateCertificate(params).promise();
        } catch (err) {
            logger.debug(`certificates.service activateCertificate: err:${err}`);
            throw new Error('UNABLE_TO_ACTIVATE_CERTIFICATE');
        }

        logger.debug('certificates.service activateCertificate: exit:');
    }

    private generatePresignedUrl(bucketName:string, key:string, presignedUrlExpiresInSeconds:number) : string {
        logger.debug(`certificates.service generatePresignedUrl: in: bucketName:${bucketName}, key:${key}, presignedUrlExpiresInSeconds:${presignedUrlExpiresInSeconds}`);
        const params = {
            Bucket: bucketName,
            Key: key,
            Expires: presignedUrlExpiresInSeconds

        };
        let signedUrl:string;
        try {
            signedUrl = this.s3.getSignedUrl('getObject', params);
        } catch (err) {
            logger.debug(`certificates.service generatePresignedUrl: err:${err}`);
            throw new Error('UNABLE_TO_PRESIGN_URL');
        }
        logger.debug(`certificates.service generatePresignedUrl: exit: signedUrl:${signedUrl}`);
        return signedUrl;
    }

    private async publishResponse(topicTemplate:string, deviceId:string, r:CertificateResponseModel) : Promise<void> {
        logger.debug(`certificates.service publishResponse: in: topicTemplate:${topicTemplate}, deviceId:${deviceId}, r:${JSON.stringify(r)}`);

        // e.g. cdf/certificates/{thingName}/get/accepted
        const topic = topicTemplate.replace('{thingName}', deviceId);

        const params = {
            topic,
            payload: JSON.stringify(r),
            qos: 1
        };

        try {
            await this.iotData.publish(params).promise();
        } catch (err) {
            logger.debug(`certificates.service publishResponse: err:${err}`);
            throw new Error('UNABLE_TO_PUBLISH_RESPONSE');
        }
        logger.debug('certificates.service publishResponse: exit:');

    }
}
