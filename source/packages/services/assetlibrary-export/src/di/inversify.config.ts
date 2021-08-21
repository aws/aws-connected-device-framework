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
import AWS = require('aws-sdk');
import config from 'config';
import { decorate, injectable, Container, interfaces } from 'inversify';
import { CDFConfigInjector } from '@cdf/config-inject';

import { TYPES } from './types';

import { DevicesAssembler } from '../devices/devices.assembler';
import { GroupsAssembler} from '../groups/groups.assembler';
import { NodeAssembler } from '../data/assembler';

import { ETLService } from '../etl/etl.service';
import { BatchService } from '../batch/batch.service';
import { CategoryBatcher } from '../batch/batchers/category.batcher';
import { TypeBatcher } from '../batch/batchers/type.batcher';
import { ExtractService } from '../etl/extract.service';
import { TransformService } from '../etl/transform.service';
import { LoadService } from '../etl/load.service';
import { LabelsDao } from '../labels/labels.dao';
import { LabelsService } from '../labels/labels.service';

import { DeviceExtractor } from '../etl/extractors/device.extractor';
import { GroupExtractor } from '../etl/extractors/group.extractor';

import { S3Loader } from '../etl/loaders/s3.loader';
import { S3Utils } from '../utils/s3.util';

import * as full from './inversify.config.full';
import { TypeUtils } from '../utils/typeUtils';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.load(full.FullContainerModule);

container.bind<TypeUtils>(TYPES.TypeUtils).to(TypeUtils).inSingletonScope();

container.bind<DevicesAssembler>(TYPES.DevicesAssembler).to(DevicesAssembler).inSingletonScope();
container.bind<GroupsAssembler>(TYPES.GroupsAssembler).to(GroupsAssembler).inSingletonScope();
container.bind<NodeAssembler>(TYPES.NodeAssembler).to(NodeAssembler).inSingletonScope();

container.bind<BatchService>(TYPES.BatchService).to(BatchService).inSingletonScope();
container.bind<CategoryBatcher>(TYPES.CategoryBatcher).to(CategoryBatcher).inSingletonScope();
container.bind<TypeBatcher>(TYPES.TypeBatcher).to(TypeBatcher).inSingletonScope();

container.bind<ETLService>(TYPES.ETLService).to(ETLService).inSingletonScope();

container.bind<ExtractService>(TYPES.ExtractService).to(ExtractService).inSingletonScope();
container.bind<TransformService>(TYPES.TransformService).to(TransformService).inSingletonScope();
container.bind<LoadService>(TYPES.LoadService).to(LoadService).inSingletonScope();
container.bind<DeviceExtractor>(TYPES.DeviceExtractor).to(DeviceExtractor).inSingletonScope();
container.bind<GroupExtractor>(TYPES.GroupExtractor).to(GroupExtractor).inSingletonScope();
container.bind<LabelsDao>(TYPES.LabelsDao).to(LabelsDao).inSingletonScope();
container.bind<LabelsService>(TYPES.LabelsService).to(LabelsService).inSingletonScope();

container.bind<S3Loader>(TYPES.S3Loader).to(S3Loader).inSingletonScope();
container.bind<S3Utils>(TYPES.S3Utils).to(S3Utils).inSingletonScope();

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
        return () => {

            if (!container.isBound(TYPES.S3)) {
                const s3 = new AWS.S3({region: config.get('aws.region')});
                container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
            }
            return container.get<AWS.S3>(TYPES.S3);
        };
    });
