/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import { provisioningContainerModule } from '@cdf/provisioning-client';
import AWS = require('aws-sdk');
import { TemplatesService } from '../templates/templates.service';
import { TemplatesAssembler } from '../templates/templates.assembler';
import { TemplatesDao } from '../templates/templates.dao';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { GroupsService } from '../groups/groups.service';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupsDao } from '../groups/groups.dao';
import { DevicesService } from '../devices/devices.service';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DevicesDao } from '../devices/devices.dao';
import { DeploymentsService } from '../deployments/deployments.service';
import { DeploymentsDao } from '../deployments/deployments.dao';
import { S3Utils } from '../utils/s3.util';
import { GreengrassUtils } from '../utils/greengrass.util';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../templates/templates.controller';
import '../groups/groups.controller';
import '../devices/devices.controller';
import '../deployments/deployments.controller';
import '../subscriptions/subscriptions.controller';
import {CreateGroupVersionHandler} from '../devices/handlers/createGroupVersion.handler';
import {ExistingAssociationHandler} from '../devices/handlers/existingAssociation.handler';
import {GetPrincipalHandler} from '../devices/handlers/getPrincipal.handler';
import {GetThingHandler} from '../devices/handlers/getThing.handler';
import {ProvisionThingHandler} from '../devices/handlers/provisonThing.handler';
import {SaveGroupHandler} from '../devices/handlers/saveGroup.handler';
import {CoreConfigHandler} from '../devices/handlers/coreConfig.handler';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

// bind containers from the cdf client modules
container.load(provisioningContainerModule);

container.bind<TemplatesService>(TYPES.TemplatesService).to(TemplatesService).inSingletonScope();
container.bind<TemplatesAssembler>(TYPES.TemplatesAssembler).to(TemplatesAssembler).inSingletonScope();
container.bind<TemplatesDao>(TYPES.TemplatesDao).to(TemplatesDao).inSingletonScope();

container.bind<GroupsService>(TYPES.GroupsService).to(GroupsService).inSingletonScope();
container.bind<GroupsAssembler>(TYPES.GroupsAssembler).to(GroupsAssembler).inSingletonScope();
container.bind<GroupsDao>(TYPES.GroupsDao).to(GroupsDao).inSingletonScope();

container.bind<DevicesService>(TYPES.DevicesService).to(DevicesService).inSingletonScope();
container.bind<DevicesAssembler>(TYPES.DevicesAssembler).to(DevicesAssembler).inSingletonScope();
container.bind<DevicesDao>(TYPES.DevicesDao).to(DevicesDao).inSingletonScope();

container.bind<SubscriptionsService>(TYPES.SubscriptionsService).to(SubscriptionsService).inSingletonScope();

container.bind<DeploymentsService>(TYPES.DeploymentsService).to(DeploymentsService).inSingletonScope();
container.bind<DeploymentsDao>(TYPES.DeploymentsDao).to(DeploymentsDao).inSingletonScope();

container.bind<CreateGroupVersionHandler>(TYPES.CreateGroupVersionDeviceAssociationHandler)
    .to(CreateGroupVersionHandler).inSingletonScope();
container.bind<ExistingAssociationHandler>(TYPES.ExistingAssociationDeviceAssociationHandler)
    .to(ExistingAssociationHandler).inSingletonScope();
container.bind<GetPrincipalHandler>(TYPES.GetPrincipalDeviceAssociationHandler)
    .to(GetPrincipalHandler).inSingletonScope();
container.bind<GetThingHandler>(TYPES.GetThingDeviceAssociationHandler1)
    .to(GetThingHandler).inSingletonScope();
container.bind<GetThingHandler>(TYPES.GetThingDeviceAssociationHandler2)
    .to(GetThingHandler).inSingletonScope();
container.bind<CoreConfigHandler>(TYPES.CoreConfigHandler)
    .to(CoreConfigHandler).inSingletonScope();
container.bind<ProvisionThingHandler>(TYPES.ProvisionThingDeviceAssociationHandler)
    .to(ProvisionThingHandler).inSingletonScope();
container.bind<SaveGroupHandler>(TYPES.SaveGroupDeviceAssociationHandler)
    .to(SaveGroupHandler).inSingletonScope();

container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils).inSingletonScope();
container.bind<S3Utils>(TYPES.S3Utils).to(S3Utils).inSingletonScope();
container.bind<GreengrassUtils>(TYPES.GreengrassUtils).to(GreengrassUtils).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
    return () => {

        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot({
                region: config.get('aws.region')
            });
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(iot);
        }
        return container.get<AWS.Iot>(TYPES.Iot);
    };
});

decorate(injectable(), AWS.Greengrass);
container.bind<interfaces.Factory<AWS.Greengrass>>(TYPES.GreengrassFactory)
    .toFactory<AWS.Greengrass>(() => {
    return () => {

        if (!container.isBound(TYPES.Greengrass)) {
            const gg = new AWS.Greengrass({
                region: config.get('aws.region')
            });
            container.bind<AWS.Greengrass>(TYPES.Greengrass).toConstantValue(gg);
        }
        return container.get<AWS.Greengrass>(TYPES.Greengrass);
    };
});

decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.DocumentClient)) {
            const dc = new AWS.DynamoDB.DocumentClient({region: config.get('aws.region')});
            container.bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
    };
});

decorate(injectable(), AWS.SQS);
container.bind<interfaces.Factory<AWS.SQS>>(TYPES.SQSFactory)
    .toFactory<AWS.SQS>(() => {
    return () => {

        if (!container.isBound(TYPES.SQS)) {
            const sqs = new AWS.SQS({region: config.get('aws.region')});
            container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(sqs);
        }
        return container.get<AWS.SQS>(TYPES.SQS);
    };
});

decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
    return () => {

        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({region: config.get('aws.region')});
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});
