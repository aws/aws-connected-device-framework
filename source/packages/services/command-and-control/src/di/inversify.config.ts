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
import AWS from 'aws-sdk';
// import AWSXRay from 'aws-xray-sdk-core';
import { Container, decorate, injectable, interfaces } from 'inversify';
import { assetLibraryContainerModule } from '@awssolutions/cdf-assetlibrary-client';
import { provisioningContainerModule } from '@awssolutions/cdf-provisioning-client';
import { thingListBuilderContainerModule } from '@awssolutions/cdf-thing-list-builder';
import { CommandsAssembler } from '../commands/commands.assembler';
import { CommandsDao } from '../commands/commands.dao';
import { CommandsService } from '../commands/commands.service';
import { CommandsValidator } from '../commands/commands.validator';
import { MessagesAssembler } from '../messages/messages.assembler';
import { MessagesDao } from '../messages/messages.dao';
import { MessagesService } from '../messages/messages.service';
import { BatchTargetsAction } from '../messages/workflow/workflow.batchTargets';
import { WorkflowFactory } from '../messages/workflow/workflow.factory';
import { InvalidTransitionAction } from '../messages/workflow/workflow.invalidTransition';
import { JobAction } from '../messages/workflow/workflow.job';
import { ResolveTargetsAction } from '../messages/workflow/workflow.resolveTargets';
import { ShadowAction } from '../messages/workflow/workflow.shadow';
import { TopicAction } from '../messages/workflow/workflow.topic';
import { ResponsesDao } from '../responses/responses.dao';
import { ResponsesService } from '../responses/responses.service';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { TYPES } from './types';

// xray initialization
// AWSXRay.setLogger(logger);
// AWSXRay.setContextMissingStrategy('LOG_ERROR');
// AWSXRay.capturePromise();
// AWSXRay.captureAWS(AWS);

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../commands/commands.controller';
import '../messages/messages.controller';

// Load everything needed to the Container
export const container = new Container();

container.bind<string>('aws.sqs.queues.messages.queueUrl').toConstantValue(process.env.AWS_SQS_QUEUES_MESSAGES_QUEUEURL);
container.bind<string>('aws.sqs.queues.commands.queueUrl').toConstantValue(process.env.AWS_SQS_QUEUES_COMMANDS_QUEUEURL);
container.bind<string>('aws.dynamoDb.table').toConstantValue(process.env.AWS_DYNAMODB_TABLE);
container.bind<string>('aws.s3.bucket').toConstantValue(process.env.AWS_S3_BUCKET);
container.bind<string>('aws.accountId').toConstantValue(process.env.AWS_ACCOUNTID);
container.bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
container.bind<string>('aws.iot.shadow.name').toConstantValue(process.env.AWS_IOT_SHADOW_NAME);
container.bind<string>('deliveryMethod.topic.mqttTopic').toConstantValue(process.env.DELIVERYMETHOD_TOPIC_MQTTTTOPIC);
container.bind<string>('aws.s3.roleArn').toConstantValue(process.env.AWS_S3_ROLE_ARN);
container.bind<number>('aws.sqs.queues.messages.topic.batchSize').toConstantValue(parseInt(process.env.AWS_SQS_QUEUES_MESSAGES_TOPIC_BATCHSIZE));
container.bind<number>('promises.concurrency').toConstantValue(parseInt(process.env.PROMISES_CONCURRENCY));
container.bind<number>('aws.sqs.queues.messages.job.batchSize').toConstantValue(parseInt(process.env.AWS_SQS_QUEUES_MESSAGES_JOBS_BATCHSIZE));
container.bind<number>('aws.sqs.queues.messages.shadow.batchSize').toConstantValue(parseInt(process.env.AWS_SQS_QUEUES_MESSAGES_SHADOW_BATCHSIZE));
container.bind<number>('aws.jobs.maxTargets').toConstantValue(parseInt(process.env.AWS_JOBS_MAXTARGETS));

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(provisioningContainerModule);

container.bind<CommandsDao>(TYPES.CommandsDao).to(CommandsDao);
container.bind<CommandsService>(TYPES.CommandsService).to(CommandsService);
container.bind<CommandsValidator>(TYPES.CommandsValidator).to(CommandsValidator);
container.bind<CommandsAssembler>(TYPES.CommandsAssembler).to(CommandsAssembler);

container.bind<MessagesDao>(TYPES.MessagesDao).to(MessagesDao);
container.bind<MessagesService>(TYPES.MessagesService).to(MessagesService);
container.bind<MessagesAssembler>(TYPES.MessagesAssembler).to(MessagesAssembler);

container.bind<ResponsesDao>(TYPES.ResponsesDao).to(ResponsesDao);
container.bind<ResponsesService>(TYPES.ResponsesService).to(ResponsesService);

container.bind<WorkflowFactory>(TYPES.WorkflowFactory).to(WorkflowFactory);
container.bind<InvalidTransitionAction>(TYPES.InvalidTransitionAction).to(InvalidTransitionAction);
container.bind<TopicAction>(TYPES.TopicAction).to(TopicAction);
container.bind<ShadowAction>(TYPES.ShadowAction).to(ShadowAction);
container.bind<ResolveTargetsAction>(TYPES.ResolveTargetsAction).to(ResolveTargetsAction);
container.bind<BatchTargetsAction>(TYPES.BatchTargetsAction).to(BatchTargetsAction);
container.bind<JobAction>(TYPES.JobAction).to(JobAction);

container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils);

AWS.config.update({ region: process.env.AWS_REGION });

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container.bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
        return () => {

            if (!container.isBound(TYPES.DocumentClient)) {
                const dc = new AWS.DynamoDB.DocumentClient();
                container.bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient).toConstantValue(dc);
            }
            return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
        };
    });

decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
        return () => {

            if (!container.isBound(TYPES.Iot)) {
                const iot = new AWS.Iot();
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
                    endpoint: process.env.AWS_IOT_ENDPOINT,
                });
                container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
            }
            return container.get<AWS.IotData>(TYPES.IotData);
        };
    });

container.load(thingListBuilderContainerModule);

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory)
    .toFactory<AWS.S3>(() => {
        return () => {

            if (!container.isBound(TYPES.S3)) {
                const s3 = new AWS.S3();
                container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
            }
            return container.get<AWS.S3>(TYPES.S3);
        };
    });

// SQS
decorate(injectable(), AWS.SQS);
container.bind<interfaces.Factory<AWS.SQS>>(TYPES.SQSFactory)
    .toFactory<AWS.SQS>(() => {
        return () => {

            if (!container.isBound(TYPES.SQS)) {
                const sqs = new AWS.SQS();
                container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(sqs);
            }
            return container.get<AWS.SQS>(TYPES.SQS);
        };
    });
