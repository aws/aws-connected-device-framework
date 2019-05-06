/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import {ASSTLIBRARY_CLIENT_TYPES} from './types';
import { DevicesService } from '../client/devices.service';
import { GroupsService } from '../client/groups.service';
import { PoliciesService } from '../client/policies.service';
import { SearchService } from '../client/search.service';
import { TemplatesService } from '../client/templates.service';
import { ProfilesService } from '../client/profiles.service';

export const assetLibraryContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<DevicesService>(ASSTLIBRARY_CLIENT_TYPES.DevicesService).to(DevicesService);
        bind<GroupsService>(ASSTLIBRARY_CLIENT_TYPES.GroupsService).to(GroupsService);
        bind<PoliciesService>(ASSTLIBRARY_CLIENT_TYPES.PoliciesService).to(PoliciesService);
        bind<SearchService>(ASSTLIBRARY_CLIENT_TYPES.SearchService).to(SearchService);
        bind<TemplatesService>(ASSTLIBRARY_CLIENT_TYPES.TemplatesService).to(TemplatesService);
        bind<ProfilesService>(ASSTLIBRARY_CLIENT_TYPES.ProfilesService).to(ProfilesService);
    }
);
