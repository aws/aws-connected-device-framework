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
import { getCustomUserAgent } from '@awssolutions/cdf-attribution';
import { Container, decorate, injectable, interfaces } from 'inversify';

import '../certificates/certificates.controller';
import { CertificatesDao } from '../certificates/certificates.dao';
import { CertificatesService } from '../certificates/certificates.service';
import { CertificatesTaskDao } from '../certificates/certificatestask.dao';
import { CertificatesTaskService } from '../certificates/certificatestask.service';
import '../certificates/supplier.controller';
import { TYPES } from './types';

import AWS from 'aws-sdk';

// Load everything needed to the Container
export const container = new Container();

// config
container
    .bind<string>('aws.dynamodb.tasks.tableName')
    .toConstantValue(process.env.AWS_DYNAMODB_TASKS_TABLENAME);
container
    .bind<string>('aws.s3.certificates.bucket')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_BUCKET);
container
    .bind<string>('aws.s3.certificates.prefix')
    .toConstantValue(process.env.AWS_S3_CERTIFICATES_PREFIX);
container
    .bind<number>('aws.acm.concurrency.limit')
    .toConstantValue(parseInt(process.env.AWS_ACM_CONCURRENCY_LIMIT));
container.bind<string>('defaults.chunkSize').toConstantValue(process.env.DEFAULTS_CHUNKSIZE);
container
    .bind<string>('deviceCertificateExpiryDays')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_EXPIRYDAYS);
container.bind<string>('events.request.topic').toConstantValue(process.env.EVENTS_REQUEST_TOPIC);
container
    .bind<string>('deviceCertificateInfo.commonName')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_COMMONNAME);
container
    .bind<string>('deviceCertificateInfo.organization')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_ORGANIZATION);
container
    .bind<string>('deviceCertificateInfo.organizationalUnit')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_ORGANIZATIONALUNIT);
container
    .bind<string>('deviceCertificateInfo.locality')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_LOCALITY);
container
    .bind<string>('deviceCertificateInfo.stateName')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_STATENAME);
container
    .bind<string>('deviceCertificateInfo.country')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_COUNTRY);
container
    .bind<string>('deviceCertificateInfo.emailAddress')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_EMAILADDRESS);
container
    .bind<string>('deviceCertificateInfo.distinguishedNameQualifier')
    .toConstantValue(process.env.CERTIFICATE_DEFAULT_DISTINGUISHEDNAMEQUALIFIER);

container
    .bind<CertificatesService>(TYPES.CertificatesService)
    .to(CertificatesService)
    .inSingletonScope();
container.bind<CertificatesDao>(TYPES.CertificatesDao).to(CertificatesDao).inSingletonScope();
container
    .bind<CertificatesTaskService>(TYPES.CertificatesTaskService)
    .to(CertificatesTaskService)
    .inSingletonScope();
container
    .bind<CertificatesTaskDao>(TYPES.CertificatesTaskDao)
    .to(CertificatesTaskDao)
    .inSingletonScope();

AWS.config.update({
    customUserAgent: getCustomUserAgent('bct'),
});

// for 3rd party objects, we need to use factory injectors
// DynamoDB
decorate(injectable(), AWS.DynamoDB);
container
    .bind<interfaces.Factory<AWS.DynamoDB>>(TYPES.DynamoDBFactory)
    .toFactory<AWS.DynamoDB>(() => {
        return () => {
            if (!container.isBound(TYPES.DynamoDB)) {
                const dynamodb = new AWS.DynamoDB({ region: process.env.AWS_REGION });
                container.bind<AWS.DynamoDB>(TYPES.DynamoDB).toConstantValue(dynamodb);
            }
            return container.get<AWS.DynamoDB>(TYPES.DynamoDB);
        };
    });

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
// SNS
decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory).toFactory<AWS.SNS>(() => {
    return () => {
        if (!container.isBound(TYPES.SNS)) {
            const sns = new AWS.SNS({ region: process.env.AWS_REGION });
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(sns);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
    };
});
// ACMPCA
decorate(injectable(), AWS.ACMPCA);
container.bind<interfaces.Factory<AWS.ACMPCA>>(TYPES.ACMPCAFactory).toFactory<AWS.ACMPCA>(() => {
    return () => {
        if (!container.isBound(TYPES.ACMPCA)) {
            const acmpma = new AWS.ACMPCA({ region: process.env.AWS_REGION });
            container.bind<AWS.ACMPCA>(TYPES.ACMPCA).toConstantValue(acmpma);
        }
        return container.get<AWS.ACMPCA>(TYPES.ACMPCA);
    };
});
