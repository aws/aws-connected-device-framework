/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container, decorate, injectable, interfaces } from 'inversify';
import { TYPES } from './types';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import { TemplatesDao } from '../templates/templates.dao';
import { TemplatesService } from '../templates/templates.service';
import {assetLibraryContainerModule} from '@cdf/assetlibrary-client';
import {provisioningContainerModule} from '@cdf/provisioning-client';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../templates/templates.controller';
import '../commands/commands.controller';
import '../presignedurls/presignedurls.controller';

import { CommandsDao } from '../commands/commands.dao';
import { CommandsService } from '../commands/commands.service';
import { WorkflowFactory } from '../commands/workflow/workflow.factory';
import { InvalidTransitionAction } from '../commands/workflow/workflow.invalidTransition';
import { StartJobAction } from '../commands/workflow/workflow.startjob';
import { SaveAction } from '../commands/workflow/workflow.save';
import { CreateAction } from '../commands/workflow/workflow.create';
import { PresignedUrlsService } from '../presignedurls/presignedurls.service';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(provisioningContainerModule);

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils);

container.bind<TemplatesDao>(TYPES.TemplatesDao).to(TemplatesDao);
container.bind<TemplatesService>(TYPES.TemplatesService).to(TemplatesService);

container.bind<CommandsDao>(TYPES.CommandsDao).to(CommandsDao);
container.bind<CommandsService>(TYPES.CommandsService).to(CommandsService);

container.bind<PresignedUrlsService>(TYPES.PresignedUrlsService).to(PresignedUrlsService);

container.bind<WorkflowFactory>(TYPES.WorkflowFactory).to(WorkflowFactory);
container.bind<InvalidTransitionAction>(TYPES.InvalidTransitionAction).to(InvalidTransitionAction);
container.bind<StartJobAction>(TYPES.StartJobAction).to(StartJobAction);
container.bind<SaveAction>(TYPES.SaveAction).to(SaveAction);
container.bind<CreateAction>(TYPES.CreateAction).to(CreateAction);

AWS.config.update({region: config.get('aws.region')});

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.DocumentClient)) {
            const dc = new AWS.DynamoDB.DocumentClient();
            container.bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
    };
});

decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
    return () => {

        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot();
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(iot);
        }
        return container.get<AWS.Iot>(TYPES.Iot);
    };
});

decorate(injectable(), AWS.IotData);
container.bind<interfaces.Factory<AWS.IotData>>(TYPES.IotDataFactory)
    .toFactory<AWS.IotData>(() => {
    return () => {

        if (!container.isBound(TYPES.IotData)) {
            const iotData = new AWS.IotData({
                endpoint: config.get('aws.iot.endpoint'),
            });
            container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
        }
        return container.get<AWS.IotData>(TYPES.IotData);
    };
});

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
    return () => {

        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3();
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});
