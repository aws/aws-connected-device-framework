/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container, decorate, injectable, interfaces } from 'inversify';
import {TYPES} from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';

import { HttpHeaderUtils } from '../utils/httpHeaders';
import { ThingsService } from '../things/things.service';
import { EventEmitter } from '../events/eventEmitter.service';
import { ClientIdEnforcementPolicyStepProcessor } from '../things/steps/clientidenforcementpolicystepprocessor';
import { CreateDeviceCertificateStepProcessor } from '../things/steps/createdevicecertificateprocessor';
import { RegisterDeviceCertificateWithoutCAStepProcessor } from '../things/steps/registerdevicecertificatewithoutcaprocessor';
import AWS = require('aws-sdk');

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../things/things.controller';
import '../things/bulkthings.controller';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();
container.bind<ThingsService>(TYPES.ThingsService).to(ThingsService).inSingletonScope();
container.bind<EventEmitter>(TYPES.EventEmitter).to(EventEmitter).inSingletonScope();
container.bind<ClientIdEnforcementPolicyStepProcessor>(TYPES.ClientIdEnforcementPolicyStepProcessor).to(ClientIdEnforcementPolicyStepProcessor).inSingletonScope();
container.bind<CreateDeviceCertificateStepProcessor>(TYPES.CreateDeviceCertificateStepProcessor).to(CreateDeviceCertificateStepProcessor).inSingletonScope();
container.bind<RegisterDeviceCertificateWithoutCAStepProcessor>(TYPES.RegisterDeviceCertificateWithoutCAStepProcessor)
    .to(RegisterDeviceCertificateWithoutCAStepProcessor).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
// IoT
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
