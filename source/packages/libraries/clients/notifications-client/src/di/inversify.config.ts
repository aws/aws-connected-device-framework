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
import '../config/env';

import { ContainerModule, decorate, injectable, interfaces } from 'inversify';

import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';

import { EventsApigwService } from '../client/events.apigw.service';
import { EventsLambdaService } from '../client/events.lambda.service';
import { EventsService } from '../client/events.service';
import { EventsourcesApigwService } from '../client/eventsources.apigw.service';
import { EventsourcesLambdaService } from '../client/eventsources.lambda.service';
import { EventsourcesService } from '../client/eventsources.service';
import { MessagesDebugApigwService } from '../client/messages.apigw.service';
import { MessagesDebugLambdaService } from '../client/messages.lambda.service';
import { MessagesDebugService } from '../client/messages.service';
import { SubscriptionsApigwService } from '../client/subscriptions.apigw.service';
import { SubscriptionsLambdaService } from '../client/subscriptions.lambda.service';
import { SubscriptionsService } from '../client/subscriptions.service';
import { TargetsApigwService } from '../client/targets.apigw.service';
import { TargetsLambdaService } from '../client/targets.lambda.service';
import { TargetsService } from '../client/targets.service';
import { NOTIFICATIONS_CLIENT_TYPES } from './types';

import AWS = require('aws-sdk');
export const notificationsContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind,
    ) => {
        if (process.env.NOTIFICATIONS_MODE === 'lambda') {
            bind<EventsService>(NOTIFICATIONS_CLIENT_TYPES.EventsService).to(EventsLambdaService);
            bind<EventsourcesService>(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService).to(
                EventsourcesLambdaService,
            );
            bind<SubscriptionsService>(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService).to(
                SubscriptionsLambdaService,
            );
            bind<TargetsService>(NOTIFICATIONS_CLIENT_TYPES.TargetsService).to(
                TargetsLambdaService,
            );
            bind<MessagesDebugService>(NOTIFICATIONS_CLIENT_TYPES.MessageDebugService).to(
                MessagesDebugLambdaService,
            );

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
                // always check to see if bound first incase it was bound by another client
                bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService).to(
                    LambdaInvokerService,
                );
                decorate(injectable(), AWS.Lambda);
                bind<interfaces.Factory<AWS.Lambda>>(
                    LAMBDAINVOKE_TYPES.LambdaFactory,
                ).toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
                    return () => {
                        if (!isBound(LAMBDAINVOKE_TYPES.Lambda)) {
                            const lambda = new AWS.Lambda({ region: process.env.AWS_REGION });
                            bind<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda).toConstantValue(lambda);
                        }
                        return ctx.container.get<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda);
                    };
                });
            }
        } else {
            bind<EventsService>(NOTIFICATIONS_CLIENT_TYPES.EventsService).to(EventsApigwService);
            bind<EventsourcesService>(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService).to(
                EventsourcesApigwService,
            );
            bind<SubscriptionsService>(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService).to(
                SubscriptionsApigwService,
            );
            bind<TargetsService>(NOTIFICATIONS_CLIENT_TYPES.TargetsService).to(
                TargetsApigwService,
            );
            bind<MessagesDebugService>(NOTIFICATIONS_CLIENT_TYPES.MessageDebugService).to(
                MessagesDebugApigwService,
            );
        }
    },
);
