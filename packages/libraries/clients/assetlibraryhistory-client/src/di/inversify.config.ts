/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {interfaces, ContainerModule, decorate, injectable} from 'inversify';
import {ASSETLIBRARYHISTORY_CLIENT_TYPES} from './types';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import config from 'config';
import {EventsService} from '..';
import {EventsLambdaService} from '../client/events.lambda.service';
import AWS = require('aws-sdk');
import {EventsApigwService} from '../client/events.apigw.service';

export const assetLibraryHistoryContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        if (config.has('assetLibraryHistory.mode') && config.get('assetLibraryHistory.mode') === 'lambda') {
            bind<EventsService>(ASSETLIBRARYHISTORY_CLIENT_TYPES.EventsService).to(EventsLambdaService);

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
            bind<EventsService>(ASSETLIBRARYHISTORY_CLIENT_TYPES.EventsService).to(EventsApigwService);
        }
    }
);
