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
import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import { DevicesApigwService } from '../client/devices.apigw.service';
import { DevicesLambdaService } from '../client/devices.lambda.service';
import { DevicesService } from '../client/devices.service';
import { GroupsApigwService } from '../client/groups.apigw.service';
import { GroupsLambdaService } from '../client/groups.lambda.service';
import { GroupsService } from '../client/groups.service';
import { PoliciesApigwService } from '../client/policies.apigw.service';
import { PoliciesLambdaService } from '../client/policies.lambda.service';
import { PoliciesService } from '../client/policies.service';
import { ProfilesApigwService } from '../client/profiles.apigw.service';
import { ProfilesLambdaService } from '../client/profiles.lambda.service';
import { ProfilesService } from '../client/profiles.service';
import { SearchApigwService } from '../client/search.apigw.service';
import { SearchLambdaService } from '../client/search.lambda.service';
import { SearchService } from '../client/search.service';
import { TemplatesApigwService } from '../client/templates.apigw.service';
import { TemplatesLambdaService } from '../client/templates.lambda.service';
import { TemplatesService } from '../client/templates.service';
import '../config/env';
import { ASSETLIBRARY_CLIENT_TYPES } from './types';
import AWS from 'aws-sdk'

export const assetLibraryContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        const assetlibraryMode = process.env.ASSETLIBRARY_MODE;

        if (assetlibraryMode === 'lambda') {
            bind<DevicesService>(ASSETLIBRARY_CLIENT_TYPES.DevicesService).to(
                DevicesLambdaService
            );
            bind<GroupsService>(ASSETLIBRARY_CLIENT_TYPES.GroupsService).to(GroupsLambdaService);
            bind<PoliciesService>(ASSETLIBRARY_CLIENT_TYPES.PoliciesService).to(
                PoliciesLambdaService
            );
            bind<SearchService>(ASSETLIBRARY_CLIENT_TYPES.SearchService).to(SearchLambdaService);
            bind<TemplatesService>(ASSETLIBRARY_CLIENT_TYPES.TemplatesService).to(
                TemplatesLambdaService
            );
            bind<ProfilesService>(ASSETLIBRARY_CLIENT_TYPES.ProfilesService).to(
                ProfilesLambdaService
            );

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
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
            bind<DevicesService>(ASSETLIBRARY_CLIENT_TYPES.DevicesService).to(DevicesApigwService);
            bind<GroupsService>(ASSETLIBRARY_CLIENT_TYPES.GroupsService).to(GroupsApigwService);
            bind<PoliciesService>(ASSETLIBRARY_CLIENT_TYPES.PoliciesService).to(
                PoliciesApigwService
            );
            bind<SearchService>(ASSETLIBRARY_CLIENT_TYPES.SearchService).to(SearchApigwService);
            bind<TemplatesService>(ASSETLIBRARY_CLIENT_TYPES.TemplatesService).to(
                TemplatesApigwService
            );
            bind<ProfilesService>(ASSETLIBRARY_CLIENT_TYPES.ProfilesService).to(
                ProfilesApigwService
            );
        }
    }
);
