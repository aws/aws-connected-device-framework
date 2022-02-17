import { structure } from 'gremlin';
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

import { AuthzDaoFull } from '../authz/authz.full.dao';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { CommonDaoFull } from '../data/common.full.dao';
import { FullAssembler } from '../data/full.assembler';
import { DevicesDaoFull } from '../devices/devices.full.dao';
import { DevicesServiceFull } from '../devices/devices.full.service';
import { DevicesService } from '../devices/devices.service';
import { GroupsDaoFull } from '../groups/groups.full.dao';
import { GroupsServiceFull } from '../groups/groups.full.service';
import { GroupsService } from '../groups/groups.service';
import { InitDaoFull } from '../init/init.full.dao';
import { InitServiceFull } from '../init/init.full.service';
import { InitService } from '../init/init.service';
import { PoliciesAssembler } from '../policies/policies.assembler';
import { PoliciesDaoFull } from '../policies/policies.full.dao';
import { PoliciesServiceFull } from '../policies/policies.full.service';
import { PoliciesService } from '../policies/policies.service';
import { ProfilesAssembler } from '../profiles/profiles.assembler';
import { ProfilesDaoFull } from '../profiles/profiles.full.dao';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';
import { ProfilesService } from '../profiles/profiles.service';
import { SearchDaoFull } from '../search/search.full.dao';
import { SearchServiceFull } from '../search/search.full.service';
import { SearchService } from '../search/search.service';
import { TypesDaoFull } from '../types/types.full.dao';
import { TypesServiceFull } from '../types/types.full.service';
import { TypesService } from '../types/types.service';
import { SchemaValidatorService } from '../utils/schemaValidator.service';
import { TYPES } from './types';



export const FullContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {

        bind<string>('neptuneUrl').toConstantValue(process.env.AWS_NEPTUNE_URL);
        bind<boolean>('enableDfeOptimization').toConstantValue(process.env.ENABLE_DFE_OPTIMIZATION === 'true');
        bind<string>('defaults.devices.parent.relation').toConstantValue(process.env.DEFAULTS_DEVICES_PARENT_RELATION);
        bind<string>('defaults.devices.parent.groupPath').toConstantValue(process.env.DEFAULTS_DEVICES_PARENT_GROUPPATH);
        bind<string>('defaults.devices.state').toConstantValue(process.env.DEFAULTS_DEVICES_STATE);
        bind<boolean>('authorization.enabled').toConstantValue(process.env.AUTHORIZATION_ENABLED === 'true');
        bind<boolean>('defaults.groups.validateAllowedParentPaths').toConstantValue(process.env.DEFAULTS_GROUPS_VALIDATEALLOWEDPARENTPATHS === 'true');

        bind<TypesService>(TYPES.TypesService).to(TypesServiceFull).inSingletonScope();
        bind<TypesDaoFull>(TYPES.TypesDao).to(TypesDaoFull).inSingletonScope();

        bind<DevicesService>(TYPES.DevicesService).to(DevicesServiceFull).inSingletonScope();
        bind<DevicesDaoFull>(TYPES.DevicesDao).to(DevicesDaoFull).inSingletonScope();

        bind<GroupsService>(TYPES.GroupsService).to(GroupsServiceFull).inSingletonScope();
        bind<GroupsDaoFull>(TYPES.GroupsDao).to(GroupsDaoFull).inSingletonScope();

        bind<CommonDaoFull>(TYPES.CommonDao).to(CommonDaoFull).inSingletonScope();

        bind<FullAssembler>(TYPES.FullAssembler).to(FullAssembler).inSingletonScope();

        bind<ProfilesService>(TYPES.ProfilesService).to(ProfilesServiceFull).inSingletonScope();
        bind<ProfilesDaoFull>(TYPES.ProfilesDao).to(ProfilesDaoFull).inSingletonScope();
        bind<ProfilesAssembler>(TYPES.ProfilesAssembler).to(ProfilesAssembler).inSingletonScope();

        bind<SearchService>(TYPES.SearchService).to(SearchServiceFull).inSingletonScope();
        bind<SearchDaoFull>(TYPES.SearchDao).to(SearchDaoFull).inSingletonScope();

        bind<PoliciesService>(TYPES.PoliciesService).to(PoliciesServiceFull).inSingletonScope();
        bind<PoliciesDaoFull>(TYPES.PoliciesDao).to(PoliciesDaoFull).inSingletonScope();
        bind<PoliciesAssembler>(TYPES.PoliciesAssembler).to(PoliciesAssembler).inSingletonScope();

        bind<InitService>(TYPES.InitService).to(InitServiceFull).inSingletonScope();
        bind<InitDaoFull>(TYPES.InitDao).to(InitDaoFull).inSingletonScope();

        bind<SchemaValidatorService>(TYPES.SchemaValidatorService).to(SchemaValidatorService).inSingletonScope();

        bind<AuthzDaoFull>(TYPES.AuthzDaoFull).to(AuthzDaoFull).inSingletonScope();
        bind<AuthzServiceFull>(TYPES.AuthzServiceFull).to(AuthzServiceFull).inSingletonScope();

        decorate(injectable(), structure.Graph);
        bind<interfaces.Factory<structure.Graph>>(TYPES.GraphSourceFactory)
            .toFactory<structure.Graph>((_ctx: interfaces.Context) => {
                return () => {

                    return new structure.Graph();

                };
            });
    }
);
