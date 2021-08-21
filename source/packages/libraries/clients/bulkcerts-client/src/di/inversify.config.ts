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
import {interfaces, ContainerModule, decorate, injectable} from 'inversify';
import {BULKCERTS_CLIENT_TYPES} from './types';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import AWS = require('aws-sdk');
import config from 'config';
import {CertificatesTaskService} from '../client/certificatestask.service';
import {CertificatesTaskLambdaService} from '../client/certificatestask.lambda.service';
import {CertificatesTaskApigwService} from '../client/certificatestask.apigw.service';
import {CertificatesService} from '../client/certificates.service';
import {CertificatesLambdaService} from '../client/certificates.lambda.service';
import {CertificatesApigwService} from '../client/certificates.apigw.service';

export const bulkcertsContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        if (config.has('bulkcerts.mode') && config.get('bulkcerts.mode') === 'lambda') {
            bind<CertificatesTaskService>(BULKCERTS_CLIENT_TYPES.CertificatesTaskService).to(CertificatesTaskLambdaService);
            bind<CertificatesService>(BULKCERTS_CLIENT_TYPES.CertificatesService).to(CertificatesLambdaService);

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
            bind<CertificatesTaskService>(BULKCERTS_CLIENT_TYPES.CertificatesTaskService).to(CertificatesTaskApigwService);
            bind<CertificatesService>(BULKCERTS_CLIENT_TYPES.CertificatesService).to(CertificatesApigwService);
        }
    }
);
