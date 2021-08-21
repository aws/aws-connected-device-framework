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
import {ASSTLIBRARY_CLIENT_TYPES} from './types';
import { DevicesService} from '../client/devices.service';
import { GroupsService} from '../client/groups.service';
import { PoliciesService} from '../client/policies.service';
import { SearchService} from '../client/search.service';
import { TemplatesService} from '../client/templates.service';
import { ProfilesService} from '../client/profiles.service';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import config from 'config';
import AWS = require('aws-sdk');
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import {DevicesApigwService} from '../client/devices.apigw.service';
import {GroupsApigwService} from '../client/groups.apigw.service';
import {ProfilesApigwService} from '../client/profiles.apigw.service';
import {TemplatesApigwService} from '../client/templates.apigw.service';
import {SearchApigwService} from '../client/search.apigw.service';
import {PoliciesApigwService} from '../client/policies.apigw.service';
import {DevicesLambdaService} from '../client/devices.lambda.service';
import {ProfilesLambdaService} from '../client/profiles.lambda.service';
import {SearchLambdaService} from '../client/search.lambda.service';
import {TemplatesLambdaService} from '../client/templates.lambda.service';
import {GroupsLambdaService} from '../client/groups.lambda.service';
import {PoliciesLambdaService} from '../client/policies.lambda.service';

export const assetLibraryContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        if (config.has('assetLibrary.mode') && config.get('assetLibrary.mode') === 'lambda') {
            bind<DevicesService>(ASSTLIBRARY_CLIENT_TYPES.DevicesService).to(DevicesLambdaService);
            bind<GroupsService>(ASSTLIBRARY_CLIENT_TYPES.GroupsService).to(GroupsLambdaService);
            bind<PoliciesService>(ASSTLIBRARY_CLIENT_TYPES.PoliciesService).to(PoliciesLambdaService);
            bind<SearchService>(ASSTLIBRARY_CLIENT_TYPES.SearchService).to(SearchLambdaService);
            bind<TemplatesService>(ASSTLIBRARY_CLIENT_TYPES.TemplatesService).to(TemplatesLambdaService);
            bind<ProfilesService>(ASSTLIBRARY_CLIENT_TYPES.ProfilesService).to(ProfilesLambdaService);

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
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
            bind<DevicesService>(ASSTLIBRARY_CLIENT_TYPES.DevicesService).to(DevicesApigwService);
            bind<GroupsService>(ASSTLIBRARY_CLIENT_TYPES.GroupsService).to(GroupsApigwService);
            bind<PoliciesService>(ASSTLIBRARY_CLIENT_TYPES.PoliciesService).to(PoliciesApigwService);
            bind<SearchService>(ASSTLIBRARY_CLIENT_TYPES.SearchService).to(SearchApigwService);
            bind<TemplatesService>(ASSTLIBRARY_CLIENT_TYPES.TemplatesService).to(TemplatesApigwService);
            bind<ProfilesService>(ASSTLIBRARY_CLIENT_TYPES.ProfilesService).to(ProfilesApigwService);
        }
    }
);
