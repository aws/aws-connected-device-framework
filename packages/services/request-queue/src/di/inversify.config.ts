/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container, decorate, injectable, interfaces } from 'inversify';
import {TYPES} from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';

import { ReplayService } from '../replay.service';
import AWS = require('aws-sdk');

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<ReplayService>(TYPES.ReplayService).to(ReplayService).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
// SQS
decorate(injectable(), AWS.SQS);
container.bind<interfaces.Factory<AWS.SQS>>(TYPES.SQSFactory)
    .toFactory<AWS.SQS>(() => {
    return () => {

        if (!container.isBound(TYPES.SQS)) {
            const sqs = new AWS.SQS({region: config.get('aws.region')});
            container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(sqs);
        }
        return container.get<AWS.SQS>(TYPES.SQS);
    };
});
// Lambda
decorate(injectable(), AWS.Lambda);
container.bind<interfaces.Factory<AWS.Lambda>>(TYPES.LambdaFactory)
    .toFactory<AWS.Lambda>(() => {
    return (region:string) => {

        if (!container.isBound(TYPES.Lamba)) {
            const lambda = new AWS.Lambda({region});
            container.bind<AWS.Lambda>(TYPES.Lamba).toConstantValue(lambda);
        }
        return container.get<AWS.Lambda>(TYPES.Lamba);
    };
});
