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

import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@cdf/lambda-invoke';

import { CoresApigwService } from '../client/cores.apigw.service';
import { CoresLambdaService } from '../client/cores.lambda.service';
import { CoresService } from '../client/cores.service';
import { DeploymentsApigwService } from '../client/deployments.apigw.service';
import { DeploymentsLambdaService } from '../client/deployments.lambda.service';
import { DeploymentsService } from '../client/deployments.service';
import { TemplatesApigwService } from '../client/templates.apigw.service';
import { TemplatesLambdaService } from '../client/templates.lambda.service';
import { TemplatesService } from '../client/templates.service';
import { GREENGRASS2_PROVISIONING_CLIENT_TYPES } from './types';

import AWS = require('aws-sdk');
import { FleetLambdaService } from '../client/fleet.lambda.service';
import { FleetService } from '../client/fleet.service';
import { FleetApigwService } from '../client/fleet.apigw.service';
import { DevicesLambdaService } from '../client/devices.lambda.service';
import { DevicesService } from '../client/devices.service';
import { DevicesApigwService } from '../client/devices.apigw.service';
export const greengrass2ProvisioningContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        if (process.env.GREENGRASSPROVISIONING_MODE === 'lambda') {

            bind<TemplatesService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.TemplatesService).to(TemplatesLambdaService);
            bind<CoresService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.CoresService).to(CoresLambdaService);
            bind<DeploymentsService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.DeploymentsService).to(DeploymentsLambdaService);
            bind<FleetService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.FleetService).to(FleetLambdaService);
            bind<DevicesService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.DevicesService).to(DevicesLambdaService);

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
                // always check to see if bound first incase it was bound by another client
                bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService).to(LambdaInvokerService);
                decorate(injectable(), AWS.Lambda);
                bind<interfaces.Factory<AWS.Lambda>>(LAMBDAINVOKE_TYPES.LambdaFactory)
                    .toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
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
            bind<TemplatesService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.TemplatesService).to(TemplatesApigwService);
            bind<CoresService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.CoresService).to(CoresApigwService);
            bind<DeploymentsService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.DeploymentsService).to(DeploymentsApigwService);
            bind<FleetService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.FleetService).to(FleetApigwService);
            bind<DevicesService>(GREENGRASS2_PROVISIONING_CLIENT_TYPES.DevicesService).to(DevicesApigwService);
        }
    }
);
