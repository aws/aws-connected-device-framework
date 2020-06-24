/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {PROVISIONING_CLIENT_TYPES} from './types';
import config from 'config';
import AWS = require('aws-sdk');
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES } from '@cdf/lambda-invoke';
import {ThingsLambdaService} from '../client/things.lambda.service';
import {ThingsService} from '..';
import {ThingsApigwService} from '../client/things.apigw.service';

export const provisioningContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        if (config.has('provisioning.mode') && config.get('provisioning.mode') === 'lambda') {
            bind<ThingsService>(PROVISIONING_CLIENT_TYPES.ThingsService).to(ThingsLambdaService);

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
                // always check to see if bound first incase it was bound by another client
                bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService).to(LambdaInvokerService);
                decorate(injectable(), AWS.Lambda);
                bind<interfaces.Factory<AWS.Lambda>>(LAMBDAINVOKE_TYPES.LambdaFactory)
                    .toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
                        return () => {

                            if (!isBound(LAMBDAINVOKE_TYPES.Lambda)) {
                                const lambda = new AWS.Lambda({region:config.get('aws.region')});
                                bind<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda).toConstantValue(lambda);
                            }
                            return ctx.container.get<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda);
                        };
                    });
            }

        } else {
            bind<ThingsService>(PROVISIONING_CLIENT_TYPES.ThingsService).to(ThingsApigwService);
        }
    }
);
