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
import 'reflect-metadata'
import '@cdf/config-inject';

import AWS = require('aws-sdk');
import { Container, decorate, injectable, interfaces } from 'inversify';

import { TYPES } from './types';
import { HttpHeaderUtils } from '../utils/httpHeaders';

import { ActivationAssembler } from '../activation/activation.assember';
import { ActivationService } from '../activation/activation.service';
import { ActivationDao } from '../activation/activation.dao';

import { DeploymentManager } from '../deployment/deployment.manager';
import { DeploymentService } from '../deployment/deployment.service';
import { DeploymentDao } from '../deployment/deployment.dao';
import { DeploymentAssembler } from '../deployment/deployment.assembler';

import { AgentbasedDeploymentDao } from '../deployment/agentbased-deployment.dao';
import { AgentbasedDeploymentService } from '../deployment/agentbased-deployment.service';

import { DeploymentTemplatesDao} from '../templates/template.dao';
import { DeploymentTemplatesService } from '../templates/template.service';
import { DeploymentTemplateAssembler } from '../templates/template.assembler';


import {DeploymentTaskService} from '../deployment/deploymentTask.service';
import {DeploymentTaskAssembler} from '../deployment/deploymentTask.assembler';
import {DeploymentTaskDao} from '../deployment/deploymentTask.dao';

import { S3Utils } from '../utils/s3.util';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { ExpressionParser } from '../utils/expression.util';

// Load everything needed to the Container
export const container = new Container();

container.bind<string>('aws.s3.bucket').toConstantValue(process.env.AWS_S3_ARTIFACTS_BUCKET);
container.bind<string>('aws.s3.prefix').toConstantValue(process.env.AWS_S3_ARTIFACTS_PREFIX);

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();

container.bind<DeploymentTaskDao>(TYPES.DeploymentTaskDao).to(DeploymentTaskDao).inSingletonScope();
container.bind<DeploymentTaskAssembler>(TYPES.DeploymentTaskAssembler).to(DeploymentTaskAssembler).inSingletonScope();
container.bind<DeploymentTaskService>(TYPES.DeploymentTaskService).to(DeploymentTaskService).inRequestScope();
import '../deployment/deploymentTask.controller';

container.bind<AgentbasedDeploymentService>(TYPES.AgentbasedDeploymentService).to(AgentbasedDeploymentService).inSingletonScope();
container.bind<AgentbasedDeploymentDao>(TYPES.AgentbasedDeploymentDao).to(AgentbasedDeploymentDao).inSingletonScope();
container.bind<DeploymentService>(TYPES.DeploymentService).to(DeploymentService).inSingletonScope();
container.bind<DeploymentManager>(TYPES.DeploymentManager).to(DeploymentManager).inSingletonScope();
container.bind<DeploymentDao>(TYPES.DeploymentDao).to(DeploymentDao).inSingletonScope();
container.bind<DeploymentAssembler>(TYPES.DeploymentAssembler).to(DeploymentAssembler).inSingletonScope();
import '../deployment/deployment.controller';

container.bind<DeploymentTemplatesService>(TYPES.DeploymentTemplatesService).to(DeploymentTemplatesService).inSingletonScope();
container.bind<DeploymentTemplatesDao>(TYPES.DeploymentTemplateDao).to(DeploymentTemplatesDao).inSingletonScope();
container.bind<DeploymentTemplateAssembler>(TYPES.DeploymentTemplateAssembler).to(DeploymentTemplateAssembler).inSingletonScope();
import '../templates/template.controller';

container.bind<ActivationAssembler>(TYPES.ActivationAssembler).to(ActivationAssembler).inSingletonScope();
container.bind<ActivationService>(TYPES.ActivationService).to(ActivationService).inSingletonScope();
container.bind<ActivationDao>(TYPES.ActivationDao).to(ActivationDao).inSingletonScope();
import '../activation/activation.controller';


container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils).inSingletonScope();
container.bind<ExpressionParser>(TYPES.ExpressionParser).to(ExpressionParser).inSingletonScope();



// for 3rd party objects, we need to use factory injectors
// DynamoDB
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
    return () => {

        if (!container.isBound(TYPES.DocumentClient)) {
            const dc = new AWS.DynamoDB.DocumentClient({region: process.env.AWS_REGION, convertEmptyValues:true});
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
            const sns = new AWS.SNS({region: process.env.AWS_REGION});
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(sns);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
    };
});

container.bind<S3Utils>(TYPES.S3Utils).to(S3Utils).inSingletonScope();

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
    return () => {

        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({region: process.env.AWS_REGION});
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
                const ssm = new AWS.SSM({region: process.env.AWS_REGION});
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
                const sqs = new AWS.SQS({region: process.env.AWS_REGION});
                container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(sqs);
            }
            return container.get<AWS.SQS>(TYPES.SQS);
        };
    });
