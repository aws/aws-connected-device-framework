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

import { AlertAssembler } from '../alerts/assembler';
import { DynamoDBTarget } from '../targets/dynamodb.target';
import { DynamoDbTargetDao } from '../targets/dynamoDb.target.dao';
import { MessageCompilerDao } from '../targets/messageCompiler.dao';
import { MessageCompilerService } from '../targets/messageCompiler.service';
import { SNSTarget } from '../targets/sns.target';
import { TYPES } from './types';

import AWS = require('aws-sdk');
import AmazonDaxClient = require('amazon-dax-client');
// Note: importing @controller's carries out a one time inversify metadata generation...

// Load everything needed to the Container
export const container = new Container();

// config
container.bind<string>('aws.dynamoDb.tables.eventConfig.name').toConstantValue(process.env.AWS_DYNAMODB_TABLES_EVENTCONFIG_NAME);
container.bind<string>('aws.dynamoDb.tables.eventConfig.gsi1').toConstantValue(process.env.AWS_DYNAMODB_TABLES_EVENTCONFIG_GSI1);
container.bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
container.bind<string>('aws.accountId').toConstantValue(process.env.AWS_ACCOUNTID);
container.bind<SNSTarget>(TYPES.SNSTarget).to(SNSTarget).inSingletonScope();
container.bind<DynamoDBTarget>(TYPES.DynamoDBTarget).to(DynamoDBTarget).inSingletonScope();
container.bind<MessageCompilerService>(TYPES.MessageCompilerService).to(MessageCompilerService).inSingletonScope();
container.bind<MessageCompilerDao>(TYPES.MessageCompilerDao).to(MessageCompilerDao).inSingletonScope();

container.bind<DynamoDbTargetDao>(TYPES.DynamoDbTargetDao).to(DynamoDbTargetDao).inSingletonScope();

container.bind<AlertAssembler>(TYPES.AlertAssembler).to(AlertAssembler).inSingletonScope();

// for 3rd party objects, we need to use factory injectors

decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory)
    .toFactory<AWS.SNS>(() => {
    return () => {

        if (!container.isBound(TYPES.SNS)) {
            const sns = new AWS.SNS({region: process.env.AWS_REGION});
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(sns);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
    };
});

decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.DocumentClient)) {
            const dc = new AWS.DynamoDB.DocumentClient({region: process.env.AWS_REGION});
            container.bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
    };
});
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.CachableDocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.CachableDocumentClient)) {
            // if we have DAX configured, return a DAX enabled DocumentClient, but if not just return the normal one
            let dc:AWS.DynamoDB.DocumentClient;
            if (process.env.AWS_DYNAMODB_DAX_ENDPOINTS!==undefined) {
                const dax = new AmazonDaxClient({endpoints: process.env.AWS_DYNAMODB_DAX_ENDPOINTS, region: process.env.AWS_REGION});
                dc = new AWS.DynamoDB.DocumentClient({service:dax});
            } else {
                const dcf = container.get<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory);
                dc = <AWS.DynamoDB.DocumentClient> dcf();
            }
            container.bind<AWS.DynamoDB.DocumentClient>(TYPES.CachableDocumentClient).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB.DocumentClient>(TYPES.CachableDocumentClient);
    };
});
