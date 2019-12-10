/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import AmazonDaxClient = require('amazon-dax-client');
import { SNSTarget } from '../targets/sns.target';
import { MessageCompilerService } from '../targets/messageCompiler.service';
import { MessageCompilerDao } from '../targets/messageCompiler.dao';
import { DynamoDBTarget } from '../targets/dynamodb.target';
import { DynamoDbTargetDao } from '../targets/dynamoDb.target.dao';

// Note: importing @controller's carries out a one time inversify metadata generation...

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<SNSTarget>(TYPES.SNSTarget).to(SNSTarget).inSingletonScope();
container.bind<DynamoDBTarget>(TYPES.DynamoDBTarget).to(DynamoDBTarget).inSingletonScope();
container.bind<MessageCompilerService>(TYPES.MessageCompilerService).to(MessageCompilerService).inSingletonScope();
container.bind<MessageCompilerDao>(TYPES.MessageCompilerDao).to(MessageCompilerDao).inSingletonScope();

container.bind<DynamoDbTargetDao>(TYPES.DynamoDbTargetDao).to(DynamoDbTargetDao).inSingletonScope();

// for 3rd party objects, we need to use factory injectors

decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory)
    .toFactory<AWS.SNS>(() => {
    return () => {

        if (!container.isBound(TYPES.SNS)) {
            const sns = new AWS.SNS({region: config.get('aws.region')});
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
            const dc = new AWS.DynamoDB.DocumentClient({region: config.get('aws.region')});
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
            if (config.has('aws.dynamodb.dax.endpoints')) {
                const dax = new AmazonDaxClient({endpoints: config.get('aws.dynamodb.dax.endpoints'), region: config.get('aws.region')});
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
