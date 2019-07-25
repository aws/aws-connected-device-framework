/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import { EventsService } from '../client/events.service';
import { EventSourcesService } from '../client/eventsources.service';
import { SubscriptionsService } from '../client/subscriptions.service';
import { NOTIFICATIONS_CLIENT_TYPES } from './types';

export const notificationsContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<EventsService>(NOTIFICATIONS_CLIENT_TYPES.EventsService).to(EventsService);
        bind<EventSourcesService>(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService).to(EventSourcesService);
        bind<SubscriptionsService>(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService).to(SubscriptionsService);
    }
);
