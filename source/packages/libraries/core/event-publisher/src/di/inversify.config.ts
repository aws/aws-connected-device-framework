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
import { NoOpEventPublisher, CDFEventPublisher, EventBridgePublisher } from '../index';
import { EVENT_PUBLISHER_TYPES } from './types';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

export const eventPublisherContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind,
    ) => {
        if (process.env.ENABLE_PUBLISH_EVENTS == 'true') {
            bind<CDFEventPublisher>(EVENT_PUBLISHER_TYPES.CDFEventPublisher)
                .to(EventBridgePublisher)
                .inSingletonScope();
        } else {
            bind<CDFEventPublisher>(EVENT_PUBLISHER_TYPES.CDFEventPublisher)
                .to(NoOpEventPublisher)
                .inSingletonScope();
        }

        decorate(injectable(), EventBridgeClient);
        bind<interfaces.Factory<EventBridgeClient>>(
            EVENT_PUBLISHER_TYPES.EventBridgeFactory,
        ).toFactory<EventBridgeClient>((ctx: interfaces.Context) => {
            return (region?: string) => {
                if (!isBound(EVENT_PUBLISHER_TYPES.EventBridge)) {
                    const eventBridgeClient = new EventBridgeClient({ region });
                    bind<EventBridgeClient>(EVENT_PUBLISHER_TYPES.EventBridge).toConstantValue(
                        eventBridgeClient,
                    );
                }
                return ctx.container.get<EventBridgeClient>(EVENT_PUBLISHER_TYPES.EventBridge);
            };
        });
    },
);
