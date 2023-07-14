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
import { structure } from 'gremlin';

import { TYPES } from './types';

import { DevicesService } from '../devices/devices.service';
import { GroupsService } from '../groups/groups.service';

import { DevicesDao } from '../devices/devices.dao';
import { GroupsDao } from '../groups/groups.dao';
import { FullAssembler } from '../data/full.assembler';
import { TypesService } from '../types/types.service';
import { TypesDao } from '../types/types.dao';

export const FullContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind,
    ) => {
        bind<TypesService>(TYPES.TypesService).to(TypesService).inSingletonScope();
        bind<TypesDao>(TYPES.TypesDao).to(TypesDao).inSingletonScope();

        bind<FullAssembler>(TYPES.FullAssembler).to(FullAssembler).inSingletonScope();

        bind<DevicesService>(TYPES.DevicesService).to(DevicesService).inSingletonScope();
        bind<DevicesDao>(TYPES.DevicesDao).to(DevicesDao).inSingletonScope();

        bind<GroupsService>(TYPES.GroupsService).to(GroupsService).inSingletonScope();
        bind<GroupsDao>(TYPES.GroupsDao).to(GroupsDao).inSingletonScope();

        decorate(injectable(), structure.Graph);
        bind<interfaces.Factory<structure.Graph>>(
            TYPES.GraphSourceFactory,
        ).toFactory<structure.Graph>((_ctx: interfaces.Context) => {
            return () => {
                return new structure.Graph();
            };
        });
    },
);
