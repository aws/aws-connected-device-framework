/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import AWS = require('aws-sdk');
import config from 'config';
import { Container, decorate, injectable, interfaces } from 'inversify';

import { CDFConfigInjector } from '@cdf/config-inject';

import { TYPES } from './types';
import { HttpHeaderUtils } from '../utils/httpHeaders';

import { ActivationService } from '../activation/activation.service';
import { ActivationDao } from '../activation/activation.dao';

import { DeploymentManager } from '../deployment/deployment.manager';
import { DeploymentService } from '../deployment/deployment.service';
import { DeploymentDao } from '../deployment/deployment.dao';

import { AgentlessDeploymentService } from '../deployment/agentless-deployment.service';
import { AgentbasedDeploymentDao } from '../deployment/agentbased-deployment.dao';
import { AgentbasedDeploymentService } from '../deployment/agentbased-deployment.service';

import { DeploymentTemplatesDao} from '../templates/template.dao';
import { DeploymentTemplatesService } from '../templates/template.service';

import { DynamoDbUtils } from '../utils/dynamoDb.util';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();

container.bind<AgentlessDeploymentService>(TYPES.AgentlessDeploymentService).to(AgentlessDeploymentService).inSingletonScope();
container.bind<AgentbasedDeploymentService>(TYPES.AgentbasedDeploymentService).to(AgentbasedDeploymentService).inSingletonScope();
container.bind<AgentbasedDeploymentDao>(TYPES.AgentbasedDeploymentDao).to(AgentbasedDeploymentDao).inSingletonScope();
container.bind<DeploymentService>(TYPES.DeploymentService).to(DeploymentService).inSingletonScope();
container.bind<DeploymentManager>(TYPES.DeploymentManager).to(DeploymentManager).inSingletonScope();
container.bind<DeploymentDao>(TYPES.DeploymentDao).to(DeploymentDao).inSingletonScope();
import '../deployment/deployment.controller';

container.bind<DeploymentTemplatesService>(TYPES.DeploymentTemplatesService).to(DeploymentTemplatesService).inSingletonScope();
container.bind<DeploymentTemplatesDao>(TYPES.DeploymentTemplateDao).to(DeploymentTemplatesDao).inSingletonScope();
import '../templates/template.controller';

container.bind<ActivationService>(TYPES.ActivationService).to(ActivationService).inSingletonScope();
container.bind<ActivationDao>(TYPES.ActivationDao).to(ActivationDao).inSingletonScope();
import '../activation/activation.controller';

container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
// DynamoDB
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.DocumentClient)) {
            const dc = new AWS.DynamoDB.DocumentClient({region: config.get('aws.region'), convertEmptyValues:true});
            container.bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
    };
});

// SNS
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
