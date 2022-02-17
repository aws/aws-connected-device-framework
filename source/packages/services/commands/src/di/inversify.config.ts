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
import '@cdf/config-inject';

import { Container, decorate, injectable, interfaces } from 'inversify';

import { assetLibraryContainerModule } from '@cdf/assetlibrary-client';
import { provisioningContainerModule } from '@cdf/provisioning-client';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../templates/templates.controller';
import '../commands/commands.controller';
import '../presignedurls/presignedurls.controller';
import { CommandsDao } from '../commands/commands.dao';
import { CommandsService } from '../commands/commands.service';
import { CommandsValidator } from '../commands/commands.validator';
import { CreateAction } from '../commands/workflow/workflow.create';
import { WorkflowFactory } from '../commands/workflow/workflow.factory';
import { InvalidTransitionAction } from '../commands/workflow/workflow.invalidTransition';
import { SaveAction } from '../commands/workflow/workflow.save';
import { StartJobAction } from '../commands/workflow/workflow.startjob';
import { PresignedUrlsService } from '../presignedurls/presignedurls.service';
import { RolloutsValidator } from '../rollouts/rollouts.validator';
import { TemplatesDao } from '../templates/templates.dao';
import { TemplatesService } from '../templates/templates.service';
import { TemplatesValidator } from '../templates/templates.validator';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import { TYPES } from './types';

import AWS = require('aws-sdk');
// Load everything needed to the Container
export const container = new Container();

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(provisioningContainerModule);

container.bind<string>('tmpdir').toConstantValue(process.env.TMPDIR);
container.bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
container.bind<string>('aws.accountId').toConstantValue(process.env.AWS_ACCOUNTID);
container.bind<string>('aws.s3.bucket').toConstantValue(process.env.AWS_S3_BUCKET);
container.bind<string>('aws.s3.prefix').toConstantValue(process.env.AWS_S3_PREFIX);
container.bind<string>('mqtt.topics.presigned').toConstantValue(process.env.MQTT_TOPICS_PRESIGNED);
container.bind<string>('tables.templates').toConstantValue(process.env.TABLES_TEMPLATES);
container.bind<string>('tables.jobs').toConstantValue(process.env.TABLES_JOBS);
container.bind<string>('aws.s3.roleArn').toConstantValue(process.env.AWS_S3_ROLEARN);
container.bind<string>('aws.jobs.maxTargets').toConstantValue(process.env.AWS_JOBS_MAXTARGETS);


container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils);

container.bind<TemplatesDao>(TYPES.TemplatesDao).to(TemplatesDao);
container.bind<TemplatesService>(TYPES.TemplatesService).to(TemplatesService);
container.bind<TemplatesValidator>(TYPES.TemplatesValidator).to(TemplatesValidator);

container.bind<CommandsDao>(TYPES.CommandsDao).to(CommandsDao);
container.bind<CommandsService>(TYPES.CommandsService).to(CommandsService);
container.bind<CommandsValidator>(TYPES.CommandsValidator).to(CommandsValidator);

container.bind<RolloutsValidator>(TYPES.RolloutsValidator).to(RolloutsValidator);

container.bind<PresignedUrlsService>(TYPES.PresignedUrlsService).to(PresignedUrlsService);

container.bind<WorkflowFactory>(TYPES.WorkflowFactory).to(WorkflowFactory);
container.bind<InvalidTransitionAction>(TYPES.InvalidTransitionAction).to(InvalidTransitionAction);
container.bind<StartJobAction>(TYPES.StartJobAction).to(StartJobAction);
container.bind<SaveAction>(TYPES.SaveAction).to(SaveAction);
container.bind<CreateAction>(TYPES.CreateAction).to(CreateAction);

AWS.config.update({region: process.env.AWS_REGION});

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
                endpoint: process.env.AWS_IOT_ENDPOINT,
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
