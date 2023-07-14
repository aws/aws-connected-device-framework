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
import { IoTClient } from '@aws-sdk/client-iot';
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';

import { AwsIotThingListBuilder } from '../awsIotThingListBuilder';
import { THING_LIST_BUILDER_TYPES } from './types';

export const thingListBuilderContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind,
    ) => {
        if (!isBound('aws.region')) {
            bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
        }

        bind<AwsIotThingListBuilder>(THING_LIST_BUILDER_TYPES.AwsIotThingListBuilder).to(
            AwsIotThingListBuilder,
        );

        if (!isBound(THING_LIST_BUILDER_TYPES.IotFactory)) {
            decorate(injectable(), IoTClient);
            bind<interfaces.Factory<IoTClient>>(
                THING_LIST_BUILDER_TYPES.IotFactory,
            ).toFactory<IoTClient>((ctx: interfaces.Context) => {
                return () => {
                    if (!isBound(THING_LIST_BUILDER_TYPES.Iot)) {
                        const iot = new IoTClient({ region: process.env.AWS_REGION });
                        bind<IoTClient>(THING_LIST_BUILDER_TYPES.Iot).toConstantValue(iot);
                    }
                    return ctx.container.get<IoTClient>(THING_LIST_BUILDER_TYPES.Iot);
                };
            });
        }
    },
);
