/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import {PROVISIONING_CLIENT_TYPES} from './types';
import { ThingsService } from '../client/things.service';

export const provisioningContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<ThingsService>(PROVISIONING_CLIENT_TYPES.ThingsService).to(ThingsService);
    }
);
