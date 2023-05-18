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
import '@awssolutions/cdf-config-inject';

import { Container, decorate, injectable, interfaces } from 'inversify';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GreengrassV2Client } from '@aws-sdk/client-greengrassv2';
import { IoTClient } from '@aws-sdk/client-iot';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { assetLibraryContainerModule } from '@awssolutions/cdf-assetlibrary-client';
import { provisioningContainerModule } from '@awssolutions/cdf-provisioning-client';
import { thingListBuilderContainerModule } from '@awssolutions/cdf-thing-list-builder';
import { eventPublisherContainerModule } from '@awssolutions/cdf-event-publisher';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../templates/templates.controller';
import '../coreTasks/coreTasks.controller';
import '../deviceTasks/deviceTasks.controller';
import '../devices/devices.controller';
import '../cores/cores.controller';
import '../fleet/fleet.controller';
import '../deploymentTasks/deploymentTasks.controller';
import { CoresAssembler } from '../cores/cores.assembler';
import { CoresDao } from '../cores/cores.dao';
import { CoresService } from '../cores/cores.service';
import { CoreTasksAssembler } from '../coreTasks/coreTasks.assembler';
import { CoreTasksDao } from '../coreTasks/coreTasks.dao';
import { CoreTasksService } from '../coreTasks/coreTasks.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { DeploymentTasksDao } from '../deploymentTasks/deploymentTasks.dao';
import { DeploymentTasksService } from '../deploymentTasks/deploymentTasks.service';
import { FleetDao } from '../fleet/fleet.dao';
import { FleetService } from '../fleet/fleet.service';
import { TemplatesAssembler } from '../templates/templates.assembler';
import { TemplatesDao } from '../templates/templates.dao';
import { TemplatesService } from '../templates/templates.service';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { S3Utils } from '../utils/s3.util';
import { TYPES } from './types';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DevicesService } from '../devices/devices.service';
import { DevicesDao } from '../devices/devices.dao';
import { DeviceTasksAssembler } from '../deviceTasks/deviceTasks.assembler';
import { DeviceTasksService } from '../deviceTasks/deviceTasks.service';
import { DeviceTasksDao } from '../deviceTasks/deviceTasks.dao';

// Load everything needed to the Container
export const container = new Container();

// bind containers from the cdf library modules
container.load(provisioningContainerModule);
container.load(assetLibraryContainerModule);
container.load(eventPublisherContainerModule);

container.bind<boolean>('enablePublishEvents').toConstantValue(process.env.ENABLE_PUBLISH_EVENTS == 'true');

container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils).inSingletonScope();
container.bind<S3Utils>(TYPES.S3Utils).to(S3Utils).inSingletonScope();

container.bind<CoresAssembler>(TYPES.CoresAssembler).to(CoresAssembler).inSingletonScope();
container.bind<CoresService>(TYPES.CoresService).to(CoresService).inSingletonScope();
container.bind<CoresDao>(TYPES.CoresDao).to(CoresDao).inSingletonScope();

container.bind<CoreTasksDao>(TYPES.CoreTasksDao).to(CoreTasksDao).inSingletonScope();
container.bind<CoreTasksService>(TYPES.CoreTasksService).to(CoreTasksService).inSingletonScope();
container.bind<CoreTasksAssembler>(TYPES.CoreTasksAssembler).to(CoreTasksAssembler).inSingletonScope();

container.bind<DevicesAssembler>(TYPES.DevicesAssembler).to(DevicesAssembler).inSingletonScope();
container.bind<DevicesService>(TYPES.DevicesService).to(DevicesService).inSingletonScope();
container.bind<DevicesDao>(TYPES.DevicesDao).to(DevicesDao).inSingletonScope();

container.bind<DeviceTasksAssembler>(TYPES.DeviceTasksAssembler).to(DeviceTasksAssembler).inSingletonScope();
container.bind<DeviceTasksService>(TYPES.DeviceTasksService).to(DeviceTasksService).inSingletonScope();
container.bind<DeviceTasksDao>(TYPES.DeviceTasksDao).to(DeviceTasksDao).inSingletonScope();

container.bind<TemplatesDao>(TYPES.TemplatesDao).to(TemplatesDao).inSingletonScope();
container.bind<TemplatesService>(TYPES.TemplatesService).to(TemplatesService).inSingletonScope();
container.bind<TemplatesAssembler>(TYPES.TemplatesAssembler).to(TemplatesAssembler).inSingletonScope();

container.bind<DeploymentTasksDao>(TYPES.DeploymentTasksDao).to(DeploymentTasksDao).inSingletonScope();
container.bind<DeploymentTasksService>(TYPES.DeploymentTasksService).to(DeploymentTasksService).inSingletonScope();

container.bind<DeploymentsService>(TYPES.DeploymentsService).to(DeploymentsService).inSingletonScope();

container.bind<FleetDao>(TYPES.FleetDao).to(FleetDao).inSingletonScope();
container.bind<FleetService>(TYPES.FleetService).to(FleetService).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), DynamoDBClient);
container.bind<interfaces.Factory<DynamoDBClient>>(TYPES.DynamoDBFactory)
    .toFactory<DynamoDBClient>(() => {
        return () => {

            if (!container.isBound(TYPES.DynamoDB)) {
                const ddb = new DynamoDBClient({ region: process.env.AWS_REGION });
                container.bind<DynamoDBClient>(TYPES.DynamoDB).toConstantValue(ddb);
            }
            return container.get<DynamoDBClient>(TYPES.DynamoDB);
        };
    });

decorate(injectable(), DynamoDBDocumentClient);
container.bind<interfaces.Factory<DynamoDBDocumentClient>>(TYPES.DynamoDBDocumentFactory)
    .toFactory<DynamoDBDocumentClient>(() => {
        return () => {

            if (!container.isBound(TYPES.DynamoDBDocument)) {
                const ddbFactory = container.get<interfaces.Factory<DynamoDBClient>>(TYPES.DynamoDBFactory);
                const ddb = ddbFactory() as DynamoDBClient;
                const marshallOptions = {
                    // Whether to automatically convert empty strings, blobs, and sets to `null`.
                    convertEmptyValues: false, // false, by default.
                    // Whether to remove undefined values while marshalling.
                    removeUndefinedValues: true,
                    // Whether to convert typeof object to map attribute.
                    convertClassInstanceToMap: true, // false, by default.
                };

                const unmarshallOptions = {
                    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
                    wrapNumbers: false, // false, by default.
                };
                const translateConfig = { marshallOptions, unmarshallOptions };
                const ddbDocClient = DynamoDBDocumentClient.from(ddb, translateConfig);
                container.bind<DynamoDBDocumentClient>(TYPES.DynamoDBDocument).toConstantValue(ddbDocClient);
            }
            return container.get<DynamoDBDocumentClient>(TYPES.DynamoDBDocument);
        };
    });

decorate(injectable(), SQSClient);
container.bind<interfaces.Factory<SQSClient>>(TYPES.SQSFactory)
    .toFactory<SQSClient>(() => {
        return () => {

            if (!container.isBound(TYPES.SQS)) {
                const sqs = new SQSClient({ region: process.env.AWS_REGION });
                container.bind<SQSClient>(TYPES.SQS).toConstantValue(sqs);
            }
            return container.get<SQSClient>(TYPES.SQS);
        };
    });

decorate(injectable(), S3Client);
container.bind<interfaces.Factory<S3Client>>(TYPES.S3Factory)
    .toFactory<S3Client>(() => {
        return () => {

            if (!container.isBound(TYPES.S3)) {
                const s3 = new S3Client({ region: process.env.AWS_REGION });
                container.bind<S3Client>(TYPES.S3).toConstantValue(s3);
            }
            return container.get<S3Client>(TYPES.S3);
        };
    });

decorate(injectable(), IoTClient);
container.bind<interfaces.Factory<IoTClient>>(TYPES.IotFactory)
    .toFactory<IoTClient>(() => {
        return () => {

            if (!container.isBound(TYPES.Iot)) {
                const iot = new IoTClient({ region: process.env.AWS_REGION });
                container.bind<IoTClient>(TYPES.Iot).toConstantValue(iot);
            }
            return container.get<IoTClient>(TYPES.Iot);
        };
    });

container.load(thingListBuilderContainerModule);


decorate(injectable(), GreengrassV2Client);
container.bind<interfaces.Factory<GreengrassV2Client>>(TYPES.Greengrassv2Factory)
    .toFactory<GreengrassV2Client>(() => {
        return () => {

            if (!container.isBound(TYPES.Greengrassv2)) {
                const ggv2 = new GreengrassV2Client({ region: process.env.AWS_REGION });
                container.bind<GreengrassV2Client>(TYPES.Greengrassv2).toConstantValue(ggv2);
            }
            return container.get<GreengrassV2Client>(TYPES.Greengrassv2);
        };
    });

decorate(injectable(), LambdaClient);
container.bind<interfaces.Factory<LambdaClient>>(TYPES.LambdaFactory)
    .toFactory<LambdaClient>(() => {
        return () => {

            if (!container.isBound(TYPES.Lambda)) {
                const l = new LambdaClient({ region: process.env.AWS_REGION });
                container.bind<LambdaClient>(TYPES.Lambda).toConstantValue(l);
            }
            return container.get<LambdaClient>(TYPES.Lambda);
        };
    });
