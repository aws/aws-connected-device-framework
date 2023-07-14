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

import '@awssolutions/cdf-config-inject';
import 'reflect-metadata';

import { Container, decorate, injectable, interfaces } from 'inversify';

import { LAMBDAINVOKE_TYPES, LambdaInvokerService } from '@awssolutions/cdf-lambda-invoke';

import { commandAndControlContainerModule } from '@awssolutions/cdf-commandandcontrol-client';
import { AppConfigOverrideCustomResource } from '../customResources/appConfigOverride.customResource';
import { AssetLibraryBulkGroupsCustomResource } from '../customResources/assetLibraryBulkGroups.customResource';
import { AssetLibraryInitCustomResource } from '../customResources/assetLibraryInit.customResource';
import { AssetLibraryPolicyCustomResource } from '../customResources/assetLibraryPolicy.customResource';
import { AssetLibraryTemplateCustomResource } from '../customResources/assetLibraryTemplate.customResource';
import { CommandsCommandCustomResource } from '../customResources/commandsCommand.customResource';
import { CommandsTemplateCustomResource } from '../customResources/commandsTemplate.customResource';
import { CustomResourceManager } from '../customResources/customResource.manager';
import { EventSourceCustomResource } from '../customResources/eventSource.customResource';
import { EventsCustomResource } from '../customResources/events.customResource';
import { IotDeviceDefenderCustomResource } from '../customResources/iotDeviceDefender.customResource';
import { IotEndpointCustomResource } from '../customResources/iotEndpoint.customresource';
import { IotEventsCustomResource } from '../customResources/iotEvents.customresource';
import { IotFleetIndexCustomResource } from '../customResources/iotFleetIndex.customresource';
import { IotPoliciesCustomResource } from '../customResources/iotPolicies.customresource';
import { IotRoleAliasCustomResource } from '../customResources/iotRoleAlias.customResource';
import { IotThingGroupCustomResource } from '../customResources/iotThingGroup.customresource';
import { IotThingTypeCustomResource } from '../customResources/iotThingType.customresource';
import { NeptuneEngineVersionCustomResource } from '../customResources/neptuneEngineVersion.customResource';
import { RotateCertificatesJobCustomResource } from '../customResources/rotateCertificatesJob.customresource';
import { S3PutObjectCustomResource } from '../customResources/s3PutObject.customResource';
import { StackEventsCustomResource } from '../customResources/stackEvents.customResource';
import { VpcEndpointCustomResource } from '../customResources/vpcEndpoint.customResource';
import { VpcEndpointCheckCustomResource } from '../customResources/vpcEndpointCheck.customResource';
import { TYPES } from './types';

import AWS = require('aws-sdk');
// Load everything needed to the Container
export const container = new Container();

// lambda invoker
container
    .bind<LambdaInvokerService>(LAMBDAINVOKE_TYPES.LambdaInvokerService)
    .to(LambdaInvokerService);
decorate(injectable(), AWS.Lambda);
container
    .bind<interfaces.Factory<AWS.Lambda>>(LAMBDAINVOKE_TYPES.LambdaFactory)
    .toFactory<AWS.Lambda>((ctx: interfaces.Context) => {
        return () => {
            if (!container.isBound(LAMBDAINVOKE_TYPES.Lambda)) {
                const lambda = new AWS.Lambda();
                container.bind<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda).toConstantValue(lambda);
            }
            return ctx.container.get<AWS.Lambda>(LAMBDAINVOKE_TYPES.Lambda);
        };
    });
container.load(commandAndControlContainerModule);

container
    .bind<CustomResourceManager>(TYPES.CustomResourceManager)
    .to(CustomResourceManager)
    .inSingletonScope();
container
    .bind<AppConfigOverrideCustomResource>(TYPES.AppConfigOverrideCustomResource)
    .to(AppConfigOverrideCustomResource)
    .inSingletonScope();

container
    .bind<AssetLibraryInitCustomResource>(TYPES.AssetLibraryInitCustomResource)
    .to(AssetLibraryInitCustomResource)
    .inSingletonScope();
container
    .bind<AssetLibraryBulkGroupsCustomResource>(TYPES.AssetLibraryBulkGroupsCustomResource)
    .to(AssetLibraryBulkGroupsCustomResource)
    .inSingletonScope();
container
    .bind<AssetLibraryPolicyCustomResource>(TYPES.AssetLibraryPolicyCustomResource)
    .to(AssetLibraryPolicyCustomResource)
    .inSingletonScope();
container
    .bind<AssetLibraryTemplateCustomResource>(TYPES.AssetLibraryTemplateCustomResource)
    .to(AssetLibraryTemplateCustomResource)
    .inSingletonScope();

container
    .bind<CommandsTemplateCustomResource>(TYPES.CommandsTemplateCustomResource)
    .to(CommandsTemplateCustomResource)
    .inSingletonScope();
container
    .bind<CommandsCommandCustomResource>(TYPES.CommandsCommandCustomResource)
    .to(CommandsCommandCustomResource)
    .inSingletonScope();
container
    .bind<RotateCertificatesJobCustomResource>(TYPES.RotateCertificatesJobCustomResource)
    .to(RotateCertificatesJobCustomResource)
    .inSingletonScope();

container
    .bind<IotEndpointCustomResource>(TYPES.IotEndpointCustomResource)
    .to(IotEndpointCustomResource)
    .inSingletonScope();
container
    .bind<IotEventsCustomResource>(TYPES.IotEventsCustomResource)
    .to(IotEventsCustomResource)
    .inSingletonScope();
container
    .bind<IotFleetIndexCustomResource>(TYPES.IotFleetIndexCustomResource)
    .to(IotFleetIndexCustomResource)
    .inSingletonScope();
container
    .bind<IotRoleAliasCustomResource>(TYPES.IotRoleAliasCustomResource)
    .to(IotRoleAliasCustomResource)
    .inSingletonScope();
container
    .bind<IotPoliciesCustomResource>(TYPES.IotPoliciesCustomResource)
    .to(IotPoliciesCustomResource)
    .inSingletonScope();
container
    .bind<IotThingGroupCustomResource>(TYPES.IotThingGroupCustomResource)
    .to(IotThingGroupCustomResource)
    .inSingletonScope();
container
    .bind<IotThingTypeCustomResource>(TYPES.IotThingTypeCustomResource)
    .to(IotThingTypeCustomResource)
    .inSingletonScope();

container
    .bind<NeptuneEngineVersionCustomResource>(TYPES.NeptuneEngineCustomResource)
    .to(NeptuneEngineVersionCustomResource)
    .inSingletonScope();

container
    .bind<VpcEndpointCheckCustomResource>(TYPES.VpcEndpointCheckCustomResource)
    .to(VpcEndpointCheckCustomResource)
    .inSingletonScope();
container
    .bind<VpcEndpointCustomResource>(TYPES.VpcEndpointCustomResource)
    .to(VpcEndpointCustomResource)
    .inSingletonScope();

container
    .bind<S3PutObjectCustomResource>(TYPES.S3PutObjectCustomResource)
    .to(S3PutObjectCustomResource)
    .inSingletonScope();

container
    .bind<IotDeviceDefenderCustomResource>(TYPES.IotDeviceDefenderCustomResource)
    .to(IotDeviceDefenderCustomResource)
    .inSingletonScope();
container
    .bind<EventSourceCustomResource>(TYPES.EventSourceCustomResource)
    .to(EventSourceCustomResource)
    .inSingletonScope();
container
    .bind<EventsCustomResource>(TYPES.EventsCustomResource)
    .to(EventsCustomResource)
    .inSingletonScope();

container
    .bind<StackEventsCustomResource>(TYPES.StackEventsCustomResource)
    .to(StackEventsCustomResource)
    .inSingletonScope();

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory).toFactory<AWS.S3>(() => {
    return () => {
        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({ region: process.env.AWS_REGION });
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});

// IoT
decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory).toFactory<AWS.Iot>(() => {
    return () => {
        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot({ region: process.env.AWS_REGION });
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(iot);
        }
        return container.get<AWS.Iot>(TYPES.Iot);
    };
});

decorate(injectable(), AWS.EC2);
container.bind<interfaces.Factory<AWS.EC2>>(TYPES.EC2Factory).toFactory<AWS.EC2>(() => {
    return () => {
        if (!container.isBound(TYPES.EC2)) {
            const ec2 = new AWS.EC2({ region: process.env.AWS_REGION });
            container.bind<AWS.EC2>(TYPES.EC2).toConstantValue(ec2);
        }
        return container.get<AWS.EC2>(TYPES.EC2);
    };
});

// STS
decorate(injectable(), AWS.STS);
container.bind<interfaces.Factory<AWS.STS>>(TYPES.STSFactory).toFactory<AWS.STS>(() => {
    return () => {
        if (!container.isBound(TYPES.STS)) {
            const sts = new AWS.STS();
            container.bind<AWS.STS>(TYPES.STS).toConstantValue(sts);
        }
        return container.get<AWS.STS>(TYPES.STS);
    };
});

// EventBridge
decorate(injectable(), AWS.EventBridge);
container
    .bind<interfaces.Factory<AWS.EventBridge>>(TYPES.EventBridgeFactory)
    .toFactory<AWS.EventBridge>(() => {
        return (region: string) => {
            if (!container.isBound(TYPES.EventBridge)) {
                const eventBridge = new AWS.EventBridge({ region });
                container.bind<AWS.EventBridge>(TYPES.EventBridge).toConstantValue(eventBridge);
            }
            return container.get<AWS.EventBridge>(TYPES.EventBridge);
        };
    });
