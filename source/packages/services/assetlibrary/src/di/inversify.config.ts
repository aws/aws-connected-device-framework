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
import '@cdf/config-inject'

import { Container, decorate, injectable, interfaces } from 'inversify';

import { NodeAssembler } from '../data/assembler';
import { DevicesAssembler } from '../devices/devices.assembler';
import { EventEmitter } from '../events/eventEmitter.service';
import { GroupsAssembler } from '../groups/groups.assembler';
import { SearchAssembler } from '../search/search.assembler';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import { TypeUtils } from '../utils/typeUtils';
import * as full from './inversify.config.full';
import * as lite from './inversify.config.lite';
import * as enhanced from './inversify.config.enhanced';
import { TYPES } from './types';

import AWS = require('aws-sdk');
// Load everything needed to the Container
export const container = new Container();

if (process.env.MODE === 'lite') {
    container.load(lite.LiteContainerModule);
} else if (process.env.MODE === 'enhanced') {
    container.load(enhanced.EnhancedContainerModule);
} else {
    container.load(full.FullContainerModule);
}

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../search/search.controller';
import '../devices/devices.controller';
import '../devices/bulkdevices.controller';
import '../groups/groups.controller';
import '../groups/bulkgroups.controller';
import '../types/types.controller';
import '../policies/policies.controller';
import '../profiles/profiles.controller';
import '../init/init.controller';

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();
container.bind<TypeUtils>(TYPES.TypeUtils).to(TypeUtils).inSingletonScope();
container.bind<DevicesAssembler>(TYPES.DevicesAssembler).to(DevicesAssembler).inSingletonScope();
container.bind<GroupsAssembler>(TYPES.GroupsAssembler).to(GroupsAssembler).inSingletonScope();
container.bind<SearchAssembler>(TYPES.SearchAssembler).to(SearchAssembler).inSingletonScope();
container.bind<EventEmitter>(TYPES.EventEmitter).to(EventEmitter).inSingletonScope();
container.bind<NodeAssembler>(TYPES.NodeAssembler).to(NodeAssembler).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.IotData);
container.bind<interfaces.Factory<AWS.IotData>>(TYPES.IotDataFactory)
    .toFactory<AWS.IotData>(() => {
    return () => {

        if (!container.isBound(TYPES.IotData)) {
            const iotData = new AWS.IotData({
                region: process.env.AWS_REGION,
                endpoint: `https://${process.env.AWS_IOT_ENDPOINT}`,
            });
            container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
        }
        return container.get<AWS.IotData>(TYPES.IotData);
    };
});
