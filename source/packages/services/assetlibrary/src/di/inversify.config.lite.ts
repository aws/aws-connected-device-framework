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
import { ContainerModule, interfaces, decorate, injectable } from 'inversify';
import { TypesService } from '../types/types.service';
import { DevicesService } from '../devices/devices.service';
import { GroupsService } from '../groups/groups.service';
import { SearchService } from '../search/search.service';
import { TYPES } from './types';
import { TypesServiceLite } from '../types/types.lite.service';
import { GroupsServiceLite } from '../groups/groups.lite.service';
import { SearchServiceLite } from '../search/search.lite.service';
import { DevicesServiceLite } from '../devices/devices.lite.service';

import AWS = require('aws-sdk');
import { TypesDaoLite } from '../types/types.lite.dao';
import { GroupsDaoLite } from '../groups/groups.lite.dao';
import { DevicesDaoLite } from '../devices/devices.lite.dao';
import { SearchDaoLite } from '../search/search.lite.dao';
import { LiteAssembler } from '../data/lite.assembler';
import { ProfilesService } from '../profiles/profiles.service';
import { PoliciesService } from '../policies/policies.service';
import { InitService } from '../init/init.service';
import { ProfilesServiceLite } from '../profiles/profiles.lite.service';
import { PoliciesServiceLite } from '../policies/policies.lite.service';
import { InitServiceLite } from '../init/init.lite.service';
import { ProfilesAssembler } from '../profiles/profiles.assembler';


export const LiteContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        bind<TypesService>(TYPES.TypesService).to(TypesServiceLite).inSingletonScope();
        bind<TypesDaoLite>(TYPES.TypesDao).to(TypesDaoLite).inSingletonScope();

        bind<DevicesService>(TYPES.DevicesService).to(DevicesServiceLite).inSingletonScope();
        bind<DevicesDaoLite>(TYPES.DevicesDao).to(DevicesDaoLite).inSingletonScope();

        bind<GroupsService>(TYPES.GroupsService).to(GroupsServiceLite).inSingletonScope();
        bind<GroupsDaoLite>(TYPES.GroupsDao).to(GroupsDaoLite).inSingletonScope();

        bind<SearchService>(TYPES.SearchService).to(SearchServiceLite).inSingletonScope();
        bind<SearchDaoLite>(TYPES.SearchDao).to(SearchDaoLite).inSingletonScope();

        bind<LiteAssembler>(TYPES.FullAssembler).to(LiteAssembler).inSingletonScope();
        bind<ProfilesService>(TYPES.ProfilesService).to(ProfilesServiceLite).inSingletonScope();
        bind<ProfilesAssembler>(TYPES.ProfilesAssembler).to(ProfilesAssembler).inSingletonScope();
        bind<PoliciesService>(TYPES.PoliciesService).to(PoliciesServiceLite).inSingletonScope();
        bind<InitService>(TYPES.InitService).to(InitServiceLite).inSingletonScope();

        decorate(injectable(), AWS.Iot);
        bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
            .toFactory<AWS.Iot>((ctx: interfaces.Context) => {
            return () => {

                if (!isBound(TYPES.Iot)) {
                    const params:AWS.Iot.Types.ClientConfiguration = {
                        region: process.env.AWS_REGION
                    };
                    const iotData = new AWS.Iot(params);
                    bind<AWS.Iot>(TYPES.Iot).toConstantValue(iotData);
                }
                return ctx.container.get<AWS.Iot>(TYPES.Iot);
            };
        });
    }
);
