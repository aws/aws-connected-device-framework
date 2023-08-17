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
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import '../config/env';

import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';

import { ThingsService } from '../';
import { ThingsApigwService } from '../client/things.apigw.service';
import { ThingsLambdaService } from '../client/things.lambda.service';
import { PROVISIONING_CLIENT_TYPES } from './types';

import AWS from 'aws-sdk';
export const provisioningContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        if (process.env.PROVISIONING_MODE === 'lambda') {
            bind<ThingsService>(PROVISIONING_CLIENT_TYPES.ThingsService).to(ThingsLambdaService);

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
                // always check to see if bound first incase it was bound by another client
                bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService).to(
                    LambdaInvokerService
                );
                decorate(injectable(), AWS.Lambda);
                bind<interfaces.Factory<AWS.Lambda>>(
                    LAMBDAINVOKE_TYPES.LambdaFactory
                ).toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
                    return () => {
                        if (!isBound(LAMBDAINVOKE_TYPES.Lambda)) {
                            const lambda = new AWS.Lambda({ region: process.env.AWS_REGION });
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
