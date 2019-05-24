/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import * as pem from 'pem';
import ow from 'ow';
import { Iot } from 'aws-sdk';
import { CertificateResponseModel } from './certificates.models';
import { UpdateCertificateRequest, DescribeCACertificateRequest, DescribeCACertificateResponse,
         RegisterCertificateRequest, RegisterCertificateResponse, ListThingPrincipalsResponse, ListPrincipalPoliciesResponse,
         AttachThingPrincipalRequest, AttachPrincipalPolicyRequest, ListPrincipalThingsResponse } from 'aws-sdk/clients/iot';
import { RegistryManager } from '../registry/registry.interfaces';

@injectable()
export class CertificateService {

    private iot: AWS.Iot;
    private iotData: AWS.IotData;
    private s3: AWS.S3;
    private ssm: AWS.SSM;

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
        @inject('certificates.caCertificateId') private caCertificateId: string,
        @inject('policies.rotatedCertificatePolicy') private rotatedCertificatePolicy: string,
        @inject('defaults.certificates.certificateExpiryDays') private certificateExpiryDays: number,
        @inject('features.deletePreviousCertificate') private deletePreviousCertificate: boolean,
        @inject(TYPES.RegistryManager) private registry:RegistryManager,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM) {
            this.iot = iotFactory();
            this.iotData = iotDataFactory();
            this.s3 = s3Factory();
            this.ssm = ssmFactory();
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

    public async getWithCsr(deviceId:string, csr:string): Promise<void> {
        logger.debug(`certificates.service getWithCsr: in: deviceId:${deviceId}, csr: ${csr}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(csr, ow.string.nonEmpty);

        const response:CertificateResponseModel = {};

        try {

            // ensure device is whitelisted
            if (await this.registry.isWhitelisted(deviceId)!==true) {
                throw new Error('DEVICE_NOT_WHITELISTED');
            }

            const caPem:string = await this.getCaCertificate(this.caCertificateId);
            const caKey:string = await this.getCAKey(this.caCertificateId);

            const certificate:string = await this.createCertificateFromCsr(csr, caKey, caPem);

            const certificateArn = await this.registerCertificate(caPem, certificate);

            await this.attachCertificateToThing(certificateArn, deviceId);
            await this.attachPolicyToCertificate(certificateArn, this.rotatedCertificatePolicy);

            // update asset library status
            await this.registry.updateAssetStatus(deviceId);

            // send success to the device
            response.certificate = certificate;
            await this.publishResponse(this.mqttGetSuccessTopic, deviceId, response);

        } catch (err) {
            logger.error(`certificates.service getWithCsr error:${err}`);
            response.message = err.message;
            await this.publishResponse(this.mqttGetFailureTopic, deviceId, response);
            throw err;
        }

        logger.debug(`certificates.service getWithCsr exit: response:${JSON.stringify(response)}`);

    }

    public async ack(deviceId:string, certId: string): Promise<void> {
        logger.debug(`certificates.service ack: in: deviceId:${deviceId}, certId: ${certId}`);

        ow(deviceId, ow.string.nonEmpty);
        ow(certId, ow.string.nonEmpty);

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

            if (this.deletePreviousCertificate) {
                await this.removePrevousCertificate(deviceId, certId);
            }

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

    private async getCaCertificate(certificateId:string) : Promise<string> {
        logger.debug(`certificates.service getCaCertificate: in: certificateId:${certificateId}`);
        const params: DescribeCACertificateRequest = {
            certificateId
        };

        let caCertificatePem:string;
        try {
            const response:DescribeCACertificateResponse = await this.iot.describeCACertificate(params).promise();
            caCertificatePem = response.certificateDescription.certificatePem;
        } catch (err) {
            logger.debug(`certificates.service getCaCertificate: err:${err}`);
            throw new Error('UNABLE_TO_GET_CA_CERTIFICATE');
        }

        logger.debug('certificates.service getCaCertificate: exit:');
        return caCertificatePem;
    }

    private async getCAKey(rootCACertId:string) : Promise<string> {
        const params = {
            Name: `cdf-ca-key-${rootCACertId}`,
            WithDecryption: true
        };

        let data;
        try {
            data = await this.ssm.getParameter(params).promise();
        } catch (err) {
            logger.debug(`certificates.service getCAKey: err:${err}`);
            throw new Error('UNABLE_TO_FETCH_CA_KEY');
        }

        return data.Parameter.Value;
    }

    private createCertificateFromCsr(csr:string, rootKey:string, rootPem:string) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.createCertificate({csr, days:this.certificateExpiryDays, serviceKey:rootKey, serviceCertificate:rootPem}, (err:any, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.certificate);
            });
        });
    }

    private async registerCertificate(ca: string, certificate:string) : Promise<string> {
        logger.debug(`certificates.service registerCertificate: in: ca: ${ca}, certificate:${certificate}`);
        const params: RegisterCertificateRequest = {
            caCertificatePem: ca,
            certificatePem: certificate,
            setAsActive: true
        };

        let certificateArn;
        try {
            const response:RegisterCertificateResponse = await this.iot.registerCertificate(params).promise();
            certificateArn = response.certificateArn;
        } catch (err) {
            logger.debug(`certificates.service registerCertificate: err:${err}`);
            throw new Error('UNABLE_TO_REGISTER_CERTIFICATE');
        }

        logger.debug(`certificates.service registerCertificate: exit: certificateArn: ${certificateArn}`);
        return certificateArn;
    }

    private async attachCertificateToThing(certificateArn:string, deviceId: string) : Promise<void> {
        logger.debug(`certificates.service attachCertificateToThing: in: certificateArn: ${certificateArn}, deviceId:${deviceId}`);
        const params: AttachThingPrincipalRequest = {
            principal: certificateArn,
            thingName: deviceId
        };

        try {
            await this.iot.attachThingPrincipal(params).promise();
        } catch (err) {
            logger.debug(`certificates.service attachCertificateToThing: err:${err}`);
            throw new Error('UNABLE_TO_ATTACH_CERTIFICATE');
        }

        logger.debug('certificates.service attachCertificateToThing: exit:');
    }

    private async attachPolicyToCertificate(certificateArn:string, policy: string) : Promise<void> {
        logger.debug(`certificates.service attachPolicyToCertificate: in: certificateArn: ${certificateArn}, policy:${policy}`);
        const params: AttachPrincipalPolicyRequest = {
            principal: certificateArn,
            policyName: policy
        };

        try {
            await this.iot.attachPrincipalPolicy(params).promise();
        } catch (err) {
            logger.debug(`certificates.service attachPolicyToCertificate: err:${err}`);
            throw new Error('UNABLE_TO_ATTACH_POLICY');
        }

        logger.debug('certificates.service attachPolicyToCertificate: exit:');
    }

    private async removePrevousCertificate(deviceId: string, certId: string): Promise<void> {
        logger.debug(`certificates.service removePrevousCertificate: in: deviceId: ${deviceId}, certId:${certId}`);

        const thingPrincipals: ListThingPrincipalsResponse = await this.iot.listThingPrincipals({thingName: deviceId}).promise();
        for (const principal of thingPrincipals.principals) {
            if (principal.includes(certId)) {
                // this is the currently connected certificate, do not remove
                continue;
            }

            await this.iot.detachThingPrincipal({thingName: deviceId, principal}).promise();

            const princpalThings: ListPrincipalThingsResponse = await this.iot.listPrincipalThings({principal}).promise();
            // delete this cert if no longer attached to any things
            if (princpalThings.things.length === 0) {
                const certificateId = principal.split('/')[1];
                const princpalPolicies: ListPrincipalPoliciesResponse = await this.iot.listPrincipalPolicies({principal}).promise();
                for (const policy of princpalPolicies.policies) {
                    await this.iot.detachPrincipalPolicy({principal, policyName: policy.policyName}).promise();
                }
                await this.iot.updateCertificate({certificateId, newStatus: 'INACTIVE'}).promise();
                await this.iot.deleteCertificate({certificateId}).promise();
            }
        }

        logger.debug('certificates.service removePrevousCertificate: exit:');
    }
}
