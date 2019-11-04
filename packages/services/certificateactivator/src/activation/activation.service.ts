/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import * as pem from 'pem';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import ow from 'ow';
import config from 'config';
import { RegistrationEvent, CertificateRevocationList, CertificateStatus } from './activation.models';
import { DevicesService, Device10Resource, PoliciesService ,ASSTLIBRARY_CLIENT_TYPES } from '@cdf/assetlibrary-client';
import { ThingsService, ProvisionThingRequest, ProvisionThingResponse, PROVISIONING_CLIENT_TYPES } from '@cdf/provisioning-client';

@injectable()
export class ActivationService {

    private PROVISIONING_POLICY_TYPE:string = 'ProvisioningTemplate';

    private iot: AWS.Iot;
    private s3: AWS.S3;

    constructor(
        @inject('aws.s3.crl.bucket') private crlBucket: string,
        @inject('aws.s3.crl.key') private crlKey: string,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(ASSTLIBRARY_CLIENT_TYPES.DevicesService) private devices:DevicesService,
        @inject(ASSTLIBRARY_CLIENT_TYPES.PoliciesService) private policies:PoliciesService,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private things:ThingsService) {
            this.iot = iotFactory();
            this.s3 = s3Factory();
    }

    public async activate(jitrEvent:RegistrationEvent): Promise<void> {
        logger.debug(`activation.service activate: in: jitrEvent:${JSON.stringify(jitrEvent)}`);

        ow(jitrEvent.certificateId, ow.string.nonEmpty);
        ow(jitrEvent.caCertificateId, ow.string.nonEmpty);
        ow(jitrEvent.timestamp, ow.number.integer);
        ow(jitrEvent.awsAccountId, ow.string.nonEmpty);
        ow(jitrEvent.certificateRegistrationTimestamp, ow.string.nonEmpty);

        const certIsRevoked = await this.isCertificateInCRL(jitrEvent.certificateId);
        if (certIsRevoked) {
            logger.debug(`certificate ${jitrEvent.certificateId} is in CRL and will not be registered`);
            await this.revokeCertificate(jitrEvent.certificateId);
            return;
        }
        logger.debug(`certificate ${jitrEvent.certificateId} is in not in CRL and will be registered`);

        const certificateCommonName = await this.getCommonNameFromCertificate(jitrEvent.certificateId);
        // Validate JITR CN = "TemplateId::DeviceId"
        if (!certificateCommonName.match(/[A-Za-z0-9_-]+::[A-Za-z0-9_-]+/g)) {
            logger.error(`certificateCommonName: ${certificateCommonName} does not match format templateid::deviceid`);
            const error = new Error();
            error.name = 'ArgumentError';
            error.message = `certificateCommonName: ${certificateCommonName} does not match format templateid::deviceid`;
            throw error;
        }
        const templateId = certificateCommonName.split('::')[0];
        const deviceId = certificateCommonName.split('::')[1];

        try {
            await this.createDeviceInAssetLibrary(deviceId, templateId);
        } catch(e) {
            logger.warn(`error creating device e: ${JSON.stringify(e)}`);
            if (e.status === 409) {
                // device already created
                // treat this as a duplicate request and do not error
                return;
            } else {
                throw e;
            }
        }

        const thingArn = await this.provisionThing(deviceId, jitrEvent.certificateId);

        await this.updateDeviceInAssetLibrary(deviceId, thingArn);

        logger.debug(`activation.service get exit:`);
    }

    private async isCertificateInCRL(certificateId:string): Promise<boolean> {
        logger.debug(`activation.service isCertificateInCRL: in: certificateId:${certificateId}`);

        const crl = await this.fetchCRL();

        for (const c of crl.revokedCertificates)  {
            if (c.certificateId === certificateId) {
                return true;
            }
        }

        return false;
    }

    private async fetchCRL(): Promise<CertificateRevocationList> {
        logger.debug(`activation.service fetchCRL: in:`);

        const params: AWS.S3.GetObjectRequest = {
            Bucket: this.crlBucket,
            Key: this.crlKey
        };

        const crlResponse:AWS.S3.GetObjectOutput = await this.s3.getObject(params).promise();
        const crl:CertificateRevocationList = JSON.parse(crlResponse.Body.toString());

        logger.debug(`activation.service fetchCRL: exit: crl: ${JSON.stringify(crl)}`);
        return crl;
    }

    private async revokeCertificate(certificateId: string): Promise<void> {
        logger.debug(`activation.service revokeCertificate: in: certificateId: ${certificateId}`);

        const params: AWS.Iot.UpdateCertificateRequest = {
            certificateId,
            newStatus: CertificateStatus.REVOKED
        };

        await this.iot.updateCertificate(params).promise();

        logger.debug(`activation.service revokeCertificate: exit:`);
    }

    private async createDeviceInAssetLibrary(deviceId: string, templateId: string): Promise<void> {
        logger.debug(`activation.service createDeviceInAssetLibrary: in: deviceId: ${deviceId}, templateId: ${templateId}`);

        const profileId: string = config.get(`assetLibrary.templateProfiles.${templateId}`);

        const device:Device10Resource = {
            deviceId,
            templateId
        };

        await this.devices.createDevice(device, profileId);
        logger.debug(`activation.service createDeviceInAssetLibrary: exit:`);
    }

    private async updateDeviceInAssetLibrary(deviceId: string, thingArn: string): Promise<void> {
        logger.debug(`activation.service updateDeviceInAssetLibrary: in: deviceId: ${deviceId}, thingArn: ${thingArn}`);
        const updateRequest:Device10Resource = {
            attributes: {
                status: 'active'
            },
            awsIotThingArn: thingArn
        };

        await this.devices.updateDevice(deviceId, updateRequest);
        logger.debug(`activation.service updateDeviceInAssetLibrary: exit:`);
    }

    private async getCommonNameFromCertificate(certificateId: string): Promise<string> {
        logger.debug(`activation.service getCommonNameFromCertificate: in: certificateId: ${certificateId}`);

        const params: AWS.Iot.DescribeCertificateRequest = {
            certificateId
        };

        const certResponse: AWS.Iot.DescribeCertificateResponse = await this.iot.describeCertificate(params).promise();
        const commonName: string = await this.getCertificateCommonName(certResponse.certificateDescription.certificatePem);

        logger.debug(`activation.service getCommonNameFromCertificate: exit: commonName: ${commonName}`);
        return commonName;
    }

    private getCertificateCommonName(certificatePem:string) : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.readCertificateInfo(certificatePem, (err:any, data:pem.CertificateSubjectReadResult) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data.commonName);
            });
        });
    }

    private async provisionThing(deviceId:string, certificateId:string) : Promise<string> {
        logger.debug(`activation.service provisionThing: in: deviceId:${deviceId}, certificateId:${certificateId}`);

        const provisioningTemplate = await this.policies.listInheritedPoliciesByDevice(deviceId, this.PROVISIONING_POLICY_TYPE);
        if (!provisioningTemplate.hasOwnProperty('results') || provisioningTemplate.results.length === 0) {
            throw new Error('PROVISIONING_TEMPLATE_NOT_FOUND');
        }
        const provisioningTemplateDocument = JSON.parse(provisioningTemplate.results[0].document);
        logger.debug(`activation.service provisionThing: template: ${JSON.stringify(provisioningTemplateDocument)}`);

        const provisionRequest:ProvisionThingRequest = {
            provisioningTemplateId: provisioningTemplateDocument.template,
            parameters: {
                ThingName: deviceId,
                CertificateId: certificateId
            }
        };

        const provisionResponse:ProvisionThingResponse = await this.things.provisionThing(provisionRequest);

        logger.debug(`activation.service provisionThing: thingArn: ${provisionResponse.resourceArns.thing}`);
        return provisionResponse.resourceArns.thing;
    }
}
