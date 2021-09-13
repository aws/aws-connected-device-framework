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
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import AmazonDaxClient = require('amazon-dax-client');
import { EventSourceService } from '../api/eventsources/eventsource.service';
import { EventSourceDao } from '../api/eventsources/eventsource.dao';
import { EventSourceAssembler } from '../api/eventsources/eventsource.assembler';
import { EventService } from '../api/events/event.service';
import { EventDao } from '../api/events/event.dao';
import { EventAssembler } from '../api/events/event.assembler';
import { SubscriptionService } from '../api/subscriptions/subscription.service';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';
import { SubscriptionAssembler } from '../api/subscriptions/subscription.assembler';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../api/eventsources/eventsource.controller';
import '../api/events/event.controller';
import '../api/subscriptions/subscription.controller';
import '../api/messages/messages.controller';
import '../api/targets/target.controller';
import '../api/messages/apigwtrigger.controller';
import { AlertDao } from '../alerts/alert.dao';
import { DDBStreamTransformer } from '../transformers/ddbstream.transformer';
import { FilterService } from '../filter/filter.service';
import { EmailTarget } from '../api/targets/processors/email.target';
import { SMSTarget } from '../api/targets/processors/sms.target';
import { SNSTarget } from '../api/targets/processors/sns.target';
import { DynamodDBTarget } from '../api/targets/processors/dynamodb.target';
import { DynamoDbEventSource } from '../api/eventsources/sources/dynamodb.source';
import { IotCoreEventSource } from '../api/eventsources/sources/iotcore.source';
import { ApiGatewayEventSource } from '../api/eventsources/sources/apigateway.source';
import { ApigwTriggerService } from '../api/messages/apigwtrigger.service';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { EventConditionsUtils } from '../api/events/event.models';
import { PushTarget } from '../api/targets/processors/push.target';
import { TargetService } from '../api/targets/target.service';
import { TargetDao } from '../api/targets/target.dao';
import { TargetAssembler } from '../api/targets/target.assembler';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<EventSourceService>(TYPES.EventSourceService).to(EventSourceService).inSingletonScope();
container.bind<EventSourceDao>(TYPES.EventSourceDao).to(EventSourceDao).inSingletonScope();
container.bind<EventSourceAssembler>(TYPES.EventSourceAssembler).to(EventSourceAssembler).inSingletonScope();

container.bind<DynamoDbEventSource>(TYPES.DynamoDbEventSource).to(DynamoDbEventSource).inSingletonScope();
container.bind<IotCoreEventSource>(TYPES.IotCoreEventSource).to(IotCoreEventSource).inSingletonScope();
container.bind<ApiGatewayEventSource>(TYPES.ApiGatewayEventSource).to(ApiGatewayEventSource).inSingletonScope();
container.bind<ApigwTriggerService>(TYPES.ApigwTriggerService).to(ApigwTriggerService).inSingletonScope();

container.bind<EventService>(TYPES.EventService).to(EventService).inSingletonScope();
container.bind<EventDao>(TYPES.EventDao).to(EventDao).inSingletonScope();
container.bind<EventAssembler>(TYPES.EventAssembler).to(EventAssembler).inSingletonScope();
container.bind<EventConditionsUtils>(TYPES.EventConditionsUtils).to(EventConditionsUtils).inSingletonScope();

container.bind<SubscriptionService>(TYPES.SubscriptionService).to(SubscriptionService).inSingletonScope();
container.bind<SubscriptionDao>(TYPES.SubscriptionDao).to(SubscriptionDao).inSingletonScope();
container.bind<SubscriptionAssembler>(TYPES.SubscriptionAssembler).to(SubscriptionAssembler).inSingletonScope();

container.bind<FilterService>(TYPES.FilterService).to(FilterService).inSingletonScope();
container.bind<AlertDao>(TYPES.AlertDao).to(AlertDao).inSingletonScope();

container.bind<DDBStreamTransformer>(TYPES.DDBStreamTransformer).to(DDBStreamTransformer).inSingletonScope();

container.bind<TargetService>(TYPES.TargetService).to(TargetService).inSingletonScope();
container.bind<TargetDao>(TYPES.TargetDao).to(TargetDao).inSingletonScope();
container.bind<TargetAssembler>(TYPES.TargetAssembler).to(TargetAssembler).inSingletonScope();

container.bind<SNSTarget>(TYPES.SNSTarget).to(SNSTarget).inSingletonScope();
container.bind<DynamodDBTarget>(TYPES.DynamodDBTarget).to(DynamodDBTarget).inSingletonScope();
container.bind<EmailTarget>(TYPES.EmailTarget).to(EmailTarget).inSingletonScope();
container.bind<SMSTarget>(TYPES.SMSTarget).to(SMSTarget).inSingletonScope();
container.bind<PushTarget>(TYPES.PushTarget).to(PushTarget).inSingletonScope();

container.bind<DynamoDbUtils>(TYPES.DynamoDbUtils).to(DynamoDbUtils).inSingletonScope();

// for 3rd party objects, we need to use factory injectors

decorate(injectable(), AWS.DynamoDB);
container.bind<interfaces.Factory<AWS.DynamoDB>>(TYPES.DynamoDBFactory)
    .toFactory<AWS.DynamoDB>(() => {
    return () => {

        if (!container.isBound(TYPES.DynamoDB)) {
            const dc =  new AWS.DynamoDB({region: config.get('aws.region')});
            container.bind<AWS.DynamoDB>(TYPES.DynamoDB).toConstantValue(dc);
        }
        return container.get<AWS.DynamoDB>(TYPES.DynamoDB);
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

decorate(injectable(), AWS.Lambda);
container.bind<interfaces.Factory<AWS.Lambda>>(TYPES.LambdaFactory)
    .toFactory<AWS.Lambda>(() => {
    return () => {

        if (!container.isBound(TYPES.Lambda)) {
            const l = new AWS.Lambda({region: config.get('aws.region')});
            container.bind<AWS.Lambda>(TYPES.Lambda).toConstantValue(l);
        }
        return container.get<AWS.Lambda>(TYPES.Lambda);
    };
});

decorate(injectable(), AWS.SNS);
container.bind<interfaces.Factory<AWS.SNS>>(TYPES.SNSFactory)
    .toFactory<AWS.SNS>(() => {
    return () => {

        if (!container.isBound(TYPES.SNS)) {
            const l = new AWS.SNS({region: config.get('aws.region')});
            container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(l);
        }
        return container.get<AWS.SNS>(TYPES.SNS);
    };
});

decorate(injectable(), AWS.Iot);
container.bind<interfaces.Factory<AWS.Iot>>(TYPES.IotFactory)
    .toFactory<AWS.Iot>(() => {
    return () => {

        if (!container.isBound(TYPES.Iot)) {
            const l = new AWS.Iot({region: config.get('aws.region')});
            container.bind<AWS.Iot>(TYPES.Iot).toConstantValue(l);
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
                endpoint: `https://${config.get('aws.iot.endpoint')}`
            });
            container.bind<AWS.IotData>(TYPES.IotData).toConstantValue(iotData);
        }
        return container.get<AWS.IotData>(TYPES.IotData);
    };
});

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
