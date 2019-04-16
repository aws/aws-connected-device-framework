/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container, decorate, injectable, interfaces } from 'inversify';
import {TYPES} from './types';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import config from 'config';
import { CertificatesService } from '../certificates/certificates.service';
import { CertificatesDao } from '../certificates/certificates.dao';
import { CertificatesTaskService } from '../certificates/certificatestask.service';
import { CertificatesTaskDao } from '../certificates/certificatestask.dao';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<CertificatesService>(TYPES.CertificatesService).to(CertificatesService).inSingletonScope();
container.bind<CertificatesDao>(TYPES.CertificatesDao).to(CertificatesDao).inSingletonScope();
container.bind<CertificatesTaskService>(TYPES.CertificatesTaskService).to(CertificatesTaskService).inSingletonScope();
container.bind<CertificatesTaskDao>(TYPES.CertificatesTaskDao).to(CertificatesTaskDao).inSingletonScope();
import '../certificates/certificates.controller';
import '../certificates/supplier.controller';

// for 3rd party objects, we need to use factory injectors
// DynamoDB
decorate(injectable(), AWS.DynamoDB);
container.bind<interfaces.Factory<AWS.DynamoDB>>(TYPES.DynamoDBFactory)
    .toFactory<AWS.DynamoDB>(() => {
    return () => {

        if (!container.isBound(TYPES.DynamoDB)) {
            const dynamodb = new AWS.DynamoDB({region: config.get('aws.region')});
            container.bind<AWS.DynamoDB>(TYPES.DynamoDB).toConstantValue(dynamodb);
        }
        return container.get<AWS.DynamoDB>(TYPES.DynamoDB);
    };
});

decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
    return () => {

        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot({region: config.get('aws.region')});
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(iot);
        }
        return container.get<AWS.Iot>(TYPES.Iot);
    };
});
// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
    return () => {

        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({region: config.get('aws.region')});
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});
// SSM
decorate(injectable(), AWS.SSM);
container.bind<interfaces.Factory<AWS.SSM>>(TYPES.SSMFactory)
    .toFactory<AWS.SSM>(() => {
    return () => {

        if (!container.isBound(TYPES.SSM)) {
            const ssm = new AWS.SSM({region: config.get('aws.region')});
            container.bind<AWS.SSM>(TYPES.SSM).toConstantValue(ssm);
        }
        return container.get<AWS.SSM>(TYPES.SSM);
    };
});
// SNS
decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory)
    .toFactory<AWS.SNS>(() => {
    return () => {

        if (!container.isBound(TYPES.SNS)) {
            const sns = new AWS.SNS({region: config.get('aws.region')});
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(sns);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
    };
});
