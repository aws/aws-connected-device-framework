/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {interfaces, ContainerModule, decorate, injectable} from 'inversify';
import {COMMANDS_CLIENT_TYPES} from './types';
import {CommandsService} from '../client/commands.service';
import {TemplatesService} from '../client/templates.service';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import AWS = require('aws-sdk');
import config from 'config';
import {CommandsLambdaService} from '../client/commands.lambda.service';
import {CommandsApigwService} from '../client/commands.apigw.service';
import {TemplatesLambdaService} from '../client/templates.lambda.service';
import {TemplatesApigwService} from '../client/templates.apigw.service';

export const commandsContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind
    ) => {
        if (config.has('commaands.mode') && config.get('commaands.mode') === 'lambda') {
            bind<CommandsService>(COMMANDS_CLIENT_TYPES.CommandsService).to(CommandsLambdaService);
            bind<TemplatesService>(COMMANDS_CLIENT_TYPES.TemplatesService).to(TemplatesLambdaService);

            if (!isBound(LAMBDAINVOKE_TYPES.LambdaInvokerService)) {
                // always check to see if bound first incase it was bound by another client
                bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService).to(LambdaInvokerService);
                decorate(injectable(), AWS.Lambda);
                bind<interfaces.Factory<AWS.Lambda>>(LAMBDAINVOKE_TYPES.LambdaFactory)
                    .toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
                        return () => {

                            if (!isBound(LAMBDAINVOKE_TYPES.Lambda)) {
                                const lambda = new AWS.Lambda({region:config.get('aws.region')});
                                bind<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda).toConstantValue(lambda);
                            }
                            return ctx.container.get<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda);
                        };
                    });
            }

        } else {
            bind<CommandsService>(COMMANDS_CLIENT_TYPES.CommandsService).to(CommandsApigwService);
            bind<TemplatesService>(COMMANDS_CLIENT_TYPES.TemplatesService).to(TemplatesApigwService);
        }
    }
);
