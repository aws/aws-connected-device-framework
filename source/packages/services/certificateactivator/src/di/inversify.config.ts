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

import { assetLibraryContainerModule } from '@awssolutions/cdf-assetlibrary-client';
import { provisioningContainerModule } from '@awssolutions/cdf-provisioning-client';

import { ActivationService } from '../activation/activation.service';
import { TYPES } from './types';

import AWS = require('aws-sdk');

// Load everything needed to the Container
export const container = new Container();

container.load(assetLibraryContainerModule);
container.load(provisioningContainerModule);

container.bind<string>('aws.s3.crl.bucket').toConstantValue(process.env.AWS_S3_CRL_BUCKET);
container.bind<string>('aws.s3.crl.key').toConstantValue(process.env.AWS_S3_CRL_KEY);

container.bind<ActivationService>(TYPES.ActivationService).to(ActivationService);

// for 3rd party objects, we need to use factory injectors
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
