/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { decorate, injectable, Container, interfaces } from 'inversify';
import { TYPES } from './types';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
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

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<EventSourceService>(TYPES.EventSourceService).to(EventSourceService).inSingletonScope();
container.bind<EventSourceDao>(TYPES.EventSourceDao).to(EventSourceDao).inSingletonScope();
container.bind<EventSourceAssembler>(TYPES.EventSourceAssembler).to(EventSourceAssembler).inSingletonScope();

container.bind<EventService>(TYPES.EventService).to(EventService).inSingletonScope();
container.bind<EventDao>(TYPES.EventDao).to(EventDao).inSingletonScope();
container.bind<EventAssembler>(TYPES.EventAssembler).to(EventAssembler).inSingletonScope();

container.bind<SubscriptionService>(TYPES.SubscriptionService).to(SubscriptionService).inSingletonScope();
container.bind<SubscriptionDao>(TYPES.SubscriptionDao).to(SubscriptionDao).inSingletonScope();
container.bind<SubscriptionAssembler>(TYPES.SubscriptionAssembler).to(SubscriptionAssembler).inSingletonScope();

// for 3rd party objects, we need to use factory injectors

decorate(injectable(), AWS.DynamoDB);
container.bind<interfaces.Factory<AWS.DynamoDB>>(TYPES.DynamoDBFactory)
    .toFactory<AWS.DynamoDB>(() => {
    return () => {

        if (!container.isBound(TYPES.DynamoDB)) {
            const dc = new AWS.DynamoDB({region: config.get('aws.region')});
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
