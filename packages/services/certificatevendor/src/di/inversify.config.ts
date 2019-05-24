/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container, decorate, injectable, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import {assetLibraryContainerModule} from '@cdf/assetlibrary-client';
import { CertificateService } from '../certificates/certificates.service';
import { RegistryManager } from '../registry/registry.interfaces';
import { AssetLibraryRegistryManager } from '../registry/assetlibrary.service';
import { DeviceRegistryManager } from '../registry/deviceregistry.service';
import { DoNothingRegistryManager } from '../registry/donothing.service';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

// configure which registry to use (used for whitelist checks and updating status post acknowkedgement)
const registry=config.get('registry.mode') as string;
if (registry==='AssetLibrary') {
    container.load(assetLibraryContainerModule);
    container.bind<RegistryManager>(TYPES.RegistryManager).to(AssetLibraryRegistryManager);
} else if (registry==='DeviceRegistry') {
    container.bind<RegistryManager>(TYPES.RegistryManager).to(DeviceRegistryManager);
} else {
    container.bind<RegistryManager>(TYPES.RegistryManager).to(DoNothingRegistryManager);
}

container.bind<CertificateService>(TYPES.CertificateService).to(CertificateService);

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
    return () => {

        if (!container.isBound(TYPES.Iot)) {
            const iot = new AWS.Iot({region: config.get('aws.region')});
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
                region: config.get('aws.region'),
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
            const s3 = new AWS.S3({region: config.get('aws.region')});
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});

// SSM
decorate(injectable(), AWS.SSM);
container.bind<interfaces.Factory<AWS.SSM>>(TYPES.SSMFactory)
    .toFactory<AWS.SSM>(() => {
    return () => {

        if (!container.isBound(TYPES.SSM)) {
            const ssm = new AWS.SSM({region: config.get('aws.region')});
            container.bind<AWS.SSM>(TYPES.SSM).toConstantValue(ssm);
        }
        return container.get<AWS.SSM>(TYPES.SSM);
    };
});
