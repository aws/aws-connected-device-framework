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
import { ORGMANLIBRARY_CLIENT_TYPES } from './types';
import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';
import AWS from 'aws-sdk'
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import { AccountsService } from '../client/accounts.service';
import { AccountsLambdaService } from '../client/accounts.lambda.service';
import { AccountsApigwService } from '../client/accounts.apigw.service';
import { OrganizationalUnitsApigwService } from '../client/organizationalUnits.apigw.service';
import { OrganizationalUnitsService } from '../client/organizationalUnits.service';
import { BulkComponentsApigwService } from '../client/bulkComponents.apigw.service';
import { BulkComponentsService } from '../client/bulkComponents.service';
import { OrganizationalUnitsLambdaService } from '../client/organizationalUnits.lambda.service';
import { BulkComponentsLambdaService } from '../client/bulkComponents.lambda.service';

export const organizationManagerContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        if (process.env.ORGANIZATIONMANAGER_MODE === 'lambda') {
            bind<AccountsService>(ORGMANLIBRARY_CLIENT_TYPES.AccountsService).to(AccountsLambdaService);
            bind<OrganizationalUnitsService>(ORGMANLIBRARY_CLIENT_TYPES.OrganizationalUnitsService).to(OrganizationalUnitsLambdaService);
            bind<BulkComponentsService>(ORGMANLIBRARY_CLIENT_TYPES.BulkComponentsService).to(BulkComponentsLambdaService);


            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
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
            bind<AccountsService>(ORGMANLIBRARY_CLIENT_TYPES.AccountsService).to(AccountsApigwService);
            bind<OrganizationalUnitsService>(ORGMANLIBRARY_CLIENT_TYPES.OrganizationalUnitsService).to(OrganizationalUnitsApigwService);
            bind<BulkComponentsService>(ORGMANLIBRARY_CLIENT_TYPES.BulkComponentsService).to(BulkComponentsApigwService);
        }
    }
);

