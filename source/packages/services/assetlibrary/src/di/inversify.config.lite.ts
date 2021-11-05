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
import { ContainerModule, interfaces } from 'inversify';
import { TypesService } from '../types/types.service';
import { DevicesService } from '../devices/devices.service';
import { GroupsService } from '../groups/groups.service';
import { SearchService } from '../search/search.service';
import { TYPES } from './types';
import { TypesServiceLite } from '../types/types.lite.service';
import { GroupsServiceLite } from '../groups/groups.lite.service';
import { ProfilesServiceLite } from '../profiles/profiles.lite.service';
import { SearchServiceLite } from '../search/search.lite.service';
import { PoliciesServiceLite } from '../policies/policies.lite.service';
import { ProfilesService } from '../profiles/profiles.service';
import { PoliciesService } from '../policies/policies.service';
import { DevicesServiceLite } from '../devices/devices.lite.service';

import { InitService } from '../init/init.service';
import { InitServiceLite } from '../init/init.lite.service';
import { TypesDaoLite } from '../types/types.lite.dao';
import { GroupsDaoLite } from '../groups/groups.lite.dao';
import { DevicesDaoLite } from '../devices/devices.lite.dao';
import { SearchDaoLite } from '../search/search.lite.dao';
import { ProfilesAssembler } from '../profiles/profiles.assembler';
import { FullAssembler } from '../data/full.assembler';

export const LiteContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<TypesService>(TYPES.TypesService).to(TypesServiceLite).inSingletonScope();
        bind<TypesDaoLite>(TYPES.TypesDao).to(TypesDaoLite).inSingletonScope();

        bind<DevicesService>(TYPES.DevicesService).to(DevicesServiceLite).inSingletonScope();
        bind<DevicesDaoLite>(TYPES.DevicesDao).to(DevicesDaoLite).inSingletonScope();

        bind<GroupsService>(TYPES.GroupsService).to(GroupsServiceLite).inSingletonScope();
        bind<GroupsDaoLite>(TYPES.GroupsDao).to(GroupsDaoLite).inSingletonScope();

        bind<ProfilesService>(TYPES.ProfilesService).to(ProfilesServiceLite).inSingletonScope();

        bind<SearchService>(TYPES.SearchService).to(SearchServiceLite).inSingletonScope();
        bind<SearchDaoLite>(TYPES.SearchDao).to(SearchDaoLite).inSingletonScope();

        bind<FullAssembler>(TYPES.FullAssembler).to(FullAssembler).inSingletonScope();
        bind<PoliciesService>(TYPES.PoliciesService).to(PoliciesServiceLite).inSingletonScope();
        bind<ProfilesAssembler>(TYPES.ProfilesAssembler).to(ProfilesAssembler).inSingletonScope();

        bind<InitService>(TYPES.InitService).to(InitServiceLite).inSingletonScope();
    }
);
