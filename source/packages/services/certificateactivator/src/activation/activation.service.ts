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
import * as pem from 'pem';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import ow from 'ow';
import {
    RegistrationEvent,
    CertificateRevocationList,
    CertificateStatus,
} from './activation.models';
import {
    DevicesService,
    Device10Resource,
    PoliciesService,
    ASSETLIBRARY_CLIENT_TYPES,
} from '@aws-solutions/cdf-assetlibrary-client';
import {
    ThingsService,
    ProvisionThingRequest,
    ProvisionThingResponse,
    PROVISIONING_CLIENT_TYPES,
} from '@aws-solutions/cdf-provisioning-client';
import atob from 'atob';

@injectable()
export class ActivationService {
    private PROVISIONING_POLICY_TYPE = 'ProvisioningTemplate';

    private iot: AWS.Iot;
    private s3: AWS.S3;

    constructor(
        @inject('aws.s3.crl.bucket') private crlBucket: string,
        @inject('aws.s3.crl.key') private crlKey: string,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService) private devices: DevicesService,
        @inject(ASSETLIBRARY_CLIENT_TYPES.PoliciesService) private policies: PoliciesService,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private things: ThingsService
    ) {
        this.iot = iotFactory();
        this.s3 = s3Factory();
    }

    public async activate(jitrEvent: RegistrationEvent): Promise<void> {
        logger.debug(`activation.service: activate: in: jitrEvent:${JSON.stringify(jitrEvent)}`);

        ow(jitrEvent.certificateId, ow.string.nonEmpty);
        ow(jitrEvent.caCertificateId, ow.string.nonEmpty);
        ow(jitrEvent.timestamp, ow.number.integer);
        ow(jitrEvent.awsAccountId, ow.string.nonEmpty);

        // check whether certificate has been revoked
        try {
            const certIsRevoked = await this.isCertificateInCRL(jitrEvent.certificateId);
            logger.debug(`activation.service: activate: certIsRevoked:${certIsRevoked}`);
            if (certIsRevoked) {
                await this.revokeCertificate(jitrEvent.certificateId);
                return;
            }
        } catch (e) {
            logger.error(
                `activation.service: activate: error with certificate revocation:${e.message}`
            );
            throw e;
        }

        // check whether device has been whitelisted
        let deviceId: string;
        try {
            deviceId = await this.getDeviceIdFromCertificate(jitrEvent.certificateId);
            const device = await this.devices.getDeviceByID(deviceId);
            if (device === undefined) {
                await this.revokeCertificate(jitrEvent.certificateId);
                return;
            }
        } catch (e) {
            logger.error(`activation.service: activate: error with whitelist:${e.message}`);
            throw e;
        }

        // all good, so go ahead and provision it
        const thingArn = await this.provisionThing(
            deviceId.toLowerCase(),
            jitrEvent.certificateId
        );

        try {
            await this.updateDeviceInAssetLibrary(deviceId, thingArn);
        } catch (e) {
            logger.error(
                `activation.service: activate: error with updating asset library:${e.message}`
            );
            throw e;
        }

        logger.debug(`activation.service get exit:`);
    }

    private async isCertificateInCRL(certificateId: string): Promise<boolean> {
        logger.debug(`activation.service isCertificateInCRL: in: certificateId:${certificateId}`);

        const crl = await this.fetchCRL();

        for (const c of crl.revokedCertificates) {
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
            Key: this.crlKey,
        };

        logger.debug(
            `activation.service fetchCRL: in: getObject: params: ${JSON.stringify(params)}`
        );

        const crlResponse: AWS.S3.GetObjectOutput = await this.s3.getObject(params).promise();
        const crl: CertificateRevocationList = JSON.parse(crlResponse.Body.toString());

        logger.debug(`activation.service fetchCRL: exit: crl: ${JSON.stringify(crl)}`);
        return crl;
    }

    private async revokeCertificate(certificateId: string): Promise<void> {
        logger.debug(`activation.service revokeCertificate: in: certificateId: ${certificateId}`);

        const params: AWS.Iot.UpdateCertificateRequest = {
            certificateId,
            newStatus: CertificateStatus.REVOKED,
        };

        await this.iot.updateCertificate(params).promise();

        logger.debug(`activation.service revokeCertificate: exit:`);
    }

    private async updateDeviceInAssetLibrary(deviceId: string, thingArn: string): Promise<void> {
        logger.debug(
            `activation.service updateDeviceInAssetLibrary: in: deviceId: ${deviceId}, thingArn: ${thingArn}`
        );
        const updateRequest: Device10Resource = {
            attributes: {
                status: 'active',
            },
            awsIotThingArn: thingArn,
        };

        await this.devices.updateDevice(deviceId, updateRequest);
        logger.debug(`activation.service updateDeviceInAssetLibrary: exit:`);
    }

    private async getDeviceIdFromCertificate(certificateId: string): Promise<string> {
        logger.debug(
            `activation.service getDeviceIdFromCertificate: in: certificateId: ${certificateId}`
        );

        const params: AWS.Iot.DescribeCertificateRequest = {
            certificateId,
        };

        const certResponse: AWS.Iot.DescribeCertificateResponse = await this.iot
            .describeCertificate(params)
            .promise();
        const commonName = await this.getCertificateCommonName(
            certResponse.certificateDescription.certificatePem
        );
        const deviceId = atob(commonName);

        logger.debug(`activation.service getDeviceIdFromCertificate: exit: deviceId: ${deviceId}`);
        return deviceId;
    }

    private getCertificateCommonName(certificatePem: string): Promise<string> {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve: any, reject: any) => {
            pem.readCertificateInfo(
                certificatePem,
                (err: any, data: pem.CertificateSubjectReadResult) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data.commonName);
                }
            );
        });
    }

    private async provisionThing(deviceId: string, certificateId: string): Promise<string> {
        logger.debug(
            `activation.service provisionThing: in: deviceId:${deviceId}, certificateId:${certificateId}`
        );

        let provisioningTemplateId: string;
        try {
            const policies = await this.policies.listInheritedPoliciesByDevice(
                deviceId,
                this.PROVISIONING_POLICY_TYPE
            );
            logger.debug(
                `activation.service provisionThing: policies: ${JSON.stringify(policies)}`
            );
            if (policies?.results === undefined || policies.results.length === 0) {
                throw new Error('PROVISIONING_TEMPLATE_NOT_FOUND');
            }
            provisioningTemplateId = JSON.parse(policies.results[0].document)['template'];
        } catch (e) {
            logger.error(
                `activation.service: provisionThing: error with provisioning template:${e.message}`
            );
            throw e;
        }
        logger.debug(
            `activation.service provisionThing: provisioningTemplateId: ${provisioningTemplateId}`
        );

        const provisionRequest: ProvisionThingRequest = {
            provisioningTemplateId,
            parameters: {
                ThingName: deviceId,
                CertificateId: certificateId,
            },
        };
        let provisionResponse: ProvisionThingResponse;
        try {
            provisionResponse = await this.things.provisionThing(provisionRequest);
        } catch (e) {
            logger.error(
                `activation.service: provisionThing: error with provisioning:${e.message}`
            );
            throw e;
        }

        logger.debug(
            `activation.service provisionThing: thingArn: ${provisionResponse?.resourceArns?.thing}`
        );
        return provisionResponse?.resourceArns?.thing;
    }
}
