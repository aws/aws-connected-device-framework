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
import { Container, decorate, injectable, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import { RenewerService } from '../renewer/renewer.service';
import { assetLibraryContainerModule } from '@cdf/assetlibrary-client';
import { ProcessorService } from '../renewer/processor.service';
import {CertificatesDao} from '../renewer/certificates.dao';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());
container.load(assetLibraryContainerModule);

container.bind<RenewerService>(TYPES.RenewerService).to(RenewerService);
container.bind<ProcessorService>(TYPES.ProcessorService).to(ProcessorService);
container.bind<CertificatesDao>(TYPES.CertificatesDao).to(CertificatesDao).inSingletonScope();

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
// SQS
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
// DynamoDB
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
