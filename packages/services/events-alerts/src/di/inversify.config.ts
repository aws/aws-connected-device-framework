/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');

// Note: importing @controller's carries out a one time inversify metadata generation...

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());


// for 3rd party objects, we need to use factory injectors

decorate(injectable(), AWS.Lambda);
container.bind<interfaces.Factory<AWS.Lambda>>(TYPES.LambdaFactory)
    .toFactory<AWS.Lambda>(() => {
    return () => {

        if (!container.isBound(TYPES.Lambda)) {
            const l = new AWS.Lambda({region: config.get('aws.region')});
            container.bind<AWS.Lambda>(TYPES.Lambda).toConstantValue(l);
        }
        return container.get<AWS.Lambda>(TYPES.Lambda);
    };
});
