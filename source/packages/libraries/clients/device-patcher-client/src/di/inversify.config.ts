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

import '../config/env';

import { ContainerModule, decorate, injectable, interfaces } from 'inversify';

import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';

import { ActivationApigwService } from '../client/activation.apigw.service';
import { ActivationLambdaService } from '../client/activation.lambda.service';
import { ActivationService } from '../client/activation.service';
import { PatchApigwService } from '../client/patch.apigw.service';
import { PatchLambdaService } from '../client/patch.lambda.service';
import { PatchService } from '../client/patch.service';
import { TemplatesApigwService } from '../client/templates.apigw.service';
import { TemplatesLambdaService } from '../client/templates.lambda.service';
import { TemplatesService } from '../client/templates.service';
import { DEVICE_PATCHER_CLIENT_TYPES } from './types';

import AWS from 'aws-sdk';
export const devicePatcherContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        if (process.env.DEVICE_PATCHER_MODE === 'lambda') {
            bind<PatchService>(DEVICE_PATCHER_CLIENT_TYPES.PatchService).to(PatchLambdaService);
            bind<ActivationService>(DEVICE_PATCHER_CLIENT_TYPES.ActivationService).to(
                ActivationLambdaService
            );
            bind<TemplatesService>(DEVICE_PATCHER_CLIENT_TYPES.TemplatesService).to(
                TemplatesLambdaService
            );

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
            bind<PatchService>(DEVICE_PATCHER_CLIENT_TYPES.PatchService).to(PatchApigwService);
            bind<ActivationService>(DEVICE_PATCHER_CLIENT_TYPES.ActivationService).to(
                ActivationApigwService
            );
            bind<TemplatesService>(DEVICE_PATCHER_CLIENT_TYPES.TemplatesService).to(
                TemplatesApigwService
            );
        }
    }
);
