import { ContainerModule, interfaces, decorate, injectable } from 'inversify';
import { TypesService } from '../types/types.service';
import { DevicesService } from '../devices/devices.service';
import { GroupsService } from '../groups/groups.service';
import { SearchService } from '../search/search.service';
import { TYPES } from './types';
import { ProfilesService } from '../profiles/profiles.service';
import { PoliciesService } from '../policies/policies.service';

import { structure } from 'gremlin';
import { TypesDaoFull } from '../types/types.full.dao';
import { DevicesDaoFull } from '../devices/devices.full.dao';
import { ProfilesDaoFull } from '../profiles/profiles.full.dao';
import { GroupsDaoFull } from '../groups/groups.full.dao';
import { SearchDaoFull } from '../search/search.full.dao';
import { PoliciesDaoFull } from '../policies/policies.full.dao';
import { TypesServiceFull } from '../types/types.full.service';
import { DevicesServiceFull } from '../devices/devices.full.service';
import { GroupsServiceFull } from '../groups/groups.full.service';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';
import { SearchServiceFull } from '../search/search.full.service';
import { PoliciesServiceFull } from '../policies/policies.full.service';
import { SchemaValidatorService } from '../utils/schemaValidator.service';
import { PoliciesAssembler} from '../policies/policies.assembler';
import { ProfilesAssembler } from '../profiles/profiles.assembler';
import { InitService } from '../init/init.service';
import { InitDaoFull } from '../init/init.full.dao';
import { InitServiceFull } from '../init/init.full.service';
import { FullAssembler } from '../data/full.assembler';
import { AuthzDaoFull } from '../authz/authz.full.dao';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { CommonDaoFull } from '../data/common.full.dao';

export const FullContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
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
