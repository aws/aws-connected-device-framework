/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import { NotificationsService } from '../client/notifications.service';
import { NOTIFICATIONS_CLIENT_TYPES } from './types';

export const notificationsContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<NotificationsService>(NOTIFICATIONS_CLIENT_TYPES.NotificationsService).to(NotificationsService);
    }
);
