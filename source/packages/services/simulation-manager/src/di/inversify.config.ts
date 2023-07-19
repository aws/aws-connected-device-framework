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

import AWS = require('aws-sdk');

import { Container, decorate, injectable, interfaces } from 'inversify';

import '../runs/runs.controller';
import { RunsDao } from '../runs/runs.dao';
import { RunsService } from '../runs/runs.service';
import '../simulations/simulations.controller';
import { SimulationsDao } from '../simulations/simulations.dao';
import { SimulationsService } from '../simulations/simulations.service';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import { TYPES } from './types';

// Load everything needed to the Container
export const container = new Container();

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();

container.bind<SimulationsDao>(TYPES.SimulationsDao).to(SimulationsDao).inSingletonScope();
container
    .bind<SimulationsService>(TYPES.SimulationsService)
    .to(SimulationsService)
    .inSingletonScope();
container.bind<RunsDao>(TYPES.RunsDao).to(RunsDao).inSingletonScope();
container.bind<RunsService>(TYPES.RunsService).to(RunsService).inSingletonScope();
// for 3rd party objects, we need to use factory injectors
// DynamoDB
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container
    .bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
        return () => {
            if (!container.isBound(TYPES.DocumentClient)) {
                const dc = new AWS.DynamoDB.DocumentClient({
                    region: process.env.AWS_REGION,
                    convertEmptyValues: true,
                });
                container
                    .bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient)
                    .toConstantValue(dc);
            }
            return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
        };
    });

// SNS
decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory).toFactory<AWS.SNS>(() => {
    return () => {
        if (!container.isBound(TYPES.SNS)) {
            const sns = new AWS.SNS({ region: process.env.AWS_REGION });
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(sns);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
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
