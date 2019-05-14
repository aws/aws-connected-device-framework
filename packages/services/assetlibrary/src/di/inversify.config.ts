/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import { DevicesAssembler } from '../devices/devices.assembler';
import { GroupsAssembler} from '../groups/groups.assembler';
import { SearchAssembler } from '../search/search.assembler';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import { EventEmitter } from '../events/eventEmitter.service';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import * as lite from './inversify.config.lite';
import * as full from './inversify.config.full';

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
import { NodeAssembler } from '../data/assembler';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

if (config.get('mode')==='lite') {
    container.load(lite.LiteContainerModule);
} else {
    container.load(full.FullContainerModule);
}

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();
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
                region: config.get('aws.region'),
                endpoint: `https://${config.get('aws.iot.endpoint')}`
            });
            container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
        }
        return container.get<AWS.IotData>(TYPES.IotData);
    };
});
