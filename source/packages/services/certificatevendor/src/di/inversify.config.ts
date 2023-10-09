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
import 'reflect-metadata';

import '@awssolutions/cdf-config-inject';

import { Container, decorate, injectable, interfaces } from 'inversify';

import { assetLibraryContainerModule } from '@awssolutions/cdf-assetlibrary-client';

import { CertificateService } from '../certificates/certificates.service';
import { AssetLibraryRegistryManager } from '../registry/assetlibrary.service';
import { DeviceRegistryManager } from '../registry/deviceregistry.service';
import { DoNothingRegistryManager } from '../registry/donothing.service';
import { RegistryManager } from '../registry/registry.interfaces';
import { TYPES } from './types';

import AWS from 'aws-sdk';

// Load everything needed to the Container
export const container = new Container();

// config
container.bind<string>('aws.accountId').toConstantValue(process.env.AWS_ACCOUNTID);
container.bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
container
    .bind<string>('aws.s3.certificates.bucket')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_BUCKET);
container
    .bind<string>('aws.s3.certificates.prefix')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_PREFIX);
container
    .bind<string>('aws.s3.certificates.suffix')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_SUFFIX);
container
    .bind<string>('aws.s3.certificates.presignedUrlExpiresInSeconds')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_PRESIGNEDURL_EXPIRESINSECONDS);
container
    .bind<string>('mqtt.topics.get.success')
    .toConstantValue(process.env.MQTT_TOPICS_GET_SUCCESS);
container
    .bind<string>('mqtt.topics.get.failure')
    .toConstantValue(process.env.MQTT_TOPICS_GET_FAILURE);
container
    .bind<string>('mqtt.topics.ack.success')
    .toConstantValue(process.env.MQTT_TOPICS_ACK_SUCCESS);
container
    .bind<string>('mqtt.topics.ack.failure')
    .toConstantValue(process.env.MQTT_TOPICS_ACK_FAILURE);
container
    .bind<string>('aws.iot.thingGroup.rotateCertificates')
    .toConstantValue(process.env.AWS_IOT_THINGGROUP_ROTATECERTIFICATES);
container
    .bind<string>('certificates.caCertificateId')
    .toConstantValue(process.env.CERTIFICATES_CACERTIFICATEID);
container
    .bind<boolean>('policies.useDefaultPolicy')
    .toConstantValue(process.env.USE_DEFAULT_POLICY === 'true');
container
    .bind<string>('policies.rotatedCertificatePolicy')
    .toConstantValue(process.env.POLICIES_ROTATEDCERTIFICATEPOLICY);
container
    .bind<string>('defaults.certificates.certificateExpiryDays')
    .toConstantValue(process.env.DEFAULTS_CERTIFICATES_CERTIFICATEEXPIRYDAYS);
container
    .bind<string>('defaults.device.status.success.key')
    .toConstantValue(process.env.DEFAULTS_DEVICE_STATUS_SUCCESS_KEY);
container
    .bind<string>('defaults.device.status.success.value')
    .toConstantValue(process.env.DEFAULTS_DEVICE_STATUS_SUCCESS_VALUE);
container
    .bind<boolean>('features.deletePreviousCertificate')
    .toConstantValue(process.env.FEATURES_DELETEPREVIOUSCERTIFICATE === 'true');
container.bind<string>('acmpca.caArn').toConstantValue(process.env.ACMPCA_CA_ARN);
container.bind<boolean>('acmpca.enabled').toConstantValue(process.env.ACMPCA_ENABLED === 'true');
container
    .bind<string>('acmpca.signingAlgorithm')
    .toConstantValue(process.env.ACMPCA_SIGNING_ALGORITHM);

// configure which registry to use (used for whitelist checks and updating status post acknowkedgement)
const registry = process.env.REGISTRY_MODE;
if (registry === 'AssetLibrary') {
    container.load(assetLibraryContainerModule);
    container.bind<RegistryManager>(TYPES.RegistryManager).to(AssetLibraryRegistryManager);
} else if (registry === 'DeviceRegistry') {
    container.bind<RegistryManager>(TYPES.RegistryManager).to(DeviceRegistryManager);
} else {
    container.bind<RegistryManager>(TYPES.RegistryManager).to(DoNothingRegistryManager);
}

container.bind<CertificateService>(TYPES.CertificateService).to(CertificateService);

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory).toFactory<AWS.Iot>(() => {
    return () => {
        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot({ region: process.env.AWS_REGION });
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(iot);
        }
        return container.get<AWS.Iot>(TYPES.Iot);
    };
});

decorate(injectable(), AWS.IotData);
container
    .bind<interfaces.Factory<AWS.IotData>>(TYPES.IotDataFactory)
    .toFactory<AWS.IotData>(() => {
        return () => {
            if (!container.isBound(TYPES.IotData)) {
                const iotData = new AWS.IotData({
                    region: process.env.AWS_REGION,
                    endpoint: process.env.AWS_IOT_ENDPOINT,
                });
                container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
            }
            return container.get<AWS.IotData>(TYPES.IotData);
        };
    });

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory).toFactory<AWS.S3>(() => {
    return () => {
        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({ region: process.env.AWS_REGION });
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});

// SSM
decorate(injectable(), AWS.SSM);
container.bind<interfaces.Factory<AWS.SSM>>(TYPES.SSMFactory).toFactory<AWS.SSM>(() => {
    return () => {
        if (!container.isBound(TYPES.SSM)) {
            const ssm = new AWS.SSM({ region: process.env.AWS_REGION });
            container.bind<AWS.SSM>(TYPES.SSM).toConstantValue(ssm);
        }
        return container.get<AWS.SSM>(TYPES.SSM);
    };
});

// STS
decorate(injectable(), AWS.STS);
container.bind<interfaces.Factory<AWS.STS>>(TYPES.STSFactory).toFactory<AWS.STS>(() => {
    return () => {
        if (!container.isBound(TYPES.STS)) {
            const sts = new AWS.STS({ region: process.env.AWS_REGION });
            container.bind<AWS.STS>(TYPES.STS).toConstantValue(sts);
        }
        return container.get<AWS.STS>(TYPES.STS);
    };
});

// ACMPCA
let acmPcaStsExpiresAt: Date;
decorate(injectable(), AWS.ACMPCA);
container.bind<interfaces.Factory<AWS.ACMPCA>>(TYPES.ACMPCAFactory).toFactory<AWS.ACMPCA>(() => {
    return () => {
        const region = process.env.ACM_REGION ?? process.env.AWS_REGION;

        // if not bound yet, or the STS token is expired, bind it
        if (!container.isBound(TYPES.ACMPCA) || isStsTokenAboutToExpire(acmPcaStsExpiresAt)) {
            const acmpcaConfig: AWS.ACMPCA.ClientConfiguration = {
                region,
            };

            // ACM PCA may be held in a different account. If so, assume a role that allows access before creating the client
            const crossAccountRole = process.env.ACM_PCA_CROSS_ACCOUNT_ROLE_ARN;
            if (crossAccountRole) {
                // these credentials will be used for ACM PCA access
                const sts = container.get<AWS.STS>(TYPES.STS);
                sts.assumeRole(
                    {
                        RoleArn: crossAccountRole,
                        RoleSessionName: 'cdf-certificatevendor',
                    },
                    (err, data) => {
                        if (err) {
                            throw err;
                        } else {
                            acmpcaConfig.credentials.accessKeyId = data.Credentials.AccessKeyId;
                            acmpcaConfig.credentials.secretAccessKey =
                                data.Credentials.SecretAccessKey;
                            acmpcaConfig.credentials.sessionToken = data.Credentials.SessionToken;
                            acmPcaStsExpiresAt = data.Credentials.Expiration;
                        }
                    }
                );
            }

            const acmpca = new AWS.ACMPCA(acmpcaConfig);
            if (container.isBound(TYPES.ACMPCA)) {
                container.rebind<AWS.ACMPCA>(TYPES.ACMPCA).toConstantValue(acmpca);
            } else {
                container.bind<AWS.ACMPCA>(TYPES.ACMPCA).toConstantValue(acmpca);
            }
        }
        return container.get<AWS.ACMPCA>(TYPES.ACMPCA);
    };
});

async function isStsTokenAboutToExpire(expiresAt: Date) {
    if (expiresAt === undefined) {
        return false;
    }
    const refreshTokenAt = new Date(Date.now() - 5 * 60 * 1000);
    return refreshTokenAt < expiresAt;
}
