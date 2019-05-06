/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { interfaces, ContainerModule } from 'inversify';
import {COMMANDS_CLIENT_TYPES} from './types';
import { CommandsService } from '../client/commands.service';
import { TemplatesService } from '../client/templates.service';

export const commandsContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        bind<CommandsService>(COMMANDS_CLIENT_TYPES.CommandsService).to(CommandsService);
        bind<TemplatesService>(COMMANDS_CLIENT_TYPES.TemplatesService).to(TemplatesService);
    }
);
