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
import {LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import config from 'config';
import AWS = require('aws-sdk');
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';

import { TemplatesService } from '../client/templates.service';
import { TemplatesLambdaService } from '../client/templates.lambda.service';
import { TemplatesApigwService } from '../client/templates.apigw.service';
import {DeploymentService} from '../client/deployment.service';
import {ActivationService} from '../client/activation.service';
import {ActivationLambdaService} from '../client/activation.lambda.service';
import {DeploymentLambdaService} from '../client/deployment.lambda.service';
import {DeploymentApigwService} from '../client/deployment.apigw.service';
import {ActivationApigwService} from '../client/activation.apigw.service';
import {GREENGRASS_DEPLOYMENT_CLIENT_TYPES} from './types';



export const greengrassDeploymentContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        if (config.has('greengrassDeployment.mode') && config.get('greengrassDeployment.mode') === 'lambda') {
            bind<DeploymentService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.DeploymentService).to(DeploymentLambdaService);
            bind<ActivationService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.ActivationService).to(ActivationLambdaService);
            bind<TemplatesService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.TemplatesService).to(TemplatesLambdaService);

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
            bind<DeploymentService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.DeploymentService).to(DeploymentApigwService);
            bind<ActivationService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.ActivationService).to(ActivationApigwService);
            bind<TemplatesService>(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.TemplatesService).to(TemplatesApigwService);
        }
    }
);
