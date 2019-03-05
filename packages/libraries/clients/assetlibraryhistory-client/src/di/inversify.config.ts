/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import {ASSETLIBRARYHISTORY_CLIENT_TYPES} from './types';
import { EventsService } from '../client/events.service';

export const assetLibraryHistoryContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<EventsService>(ASSETLIBRARYHISTORY_CLIENT_TYPES.EventsService).to(EventsService);
    }
);
