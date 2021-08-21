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
import { HttpHeaderUtils } from '../utils/httpHeaders';
import config from 'config';
import { CDFConfigInjector } from '@cdf/config-inject';
import AWS = require('aws-sdk');
import { EventsDao } from '../events/events.dao';
import { EventsService } from '../events/events.service';
import { EventActionFactory } from '../events/actions/eventaction.factory';
import { UnsupportedAction } from '../events/actions/eventaction.unsupported';
import { CreateAction } from '../events/actions/eventaction.create';
import { UpdateAction } from '../events/actions/eventaction.update';
import { DeleteAction } from '../events/actions/eventaction.delete';

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../queries/queries.controller';
import { QueryService } from '../queries/queries.service';
import { UpdateComponentParentAction } from '../events/actions/eventaction.updateComponentParent';
import { PublishTemplateAction } from '../events/actions/eventaction.publishTemplate';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils).inSingletonScope();

container.bind<EventsDao>(TYPES.EventsDao).to(EventsDao).inSingletonScope();
container.bind<EventsService>(TYPES.EventsService).to(EventsService).inSingletonScope();

container.bind<QueryService>(TYPES.QueryService).to(QueryService).inSingletonScope();

container.bind<EventActionFactory>(TYPES.EventActionFactory).to(EventActionFactory).inSingletonScope();
container.bind<CreateAction>(TYPES.CreateEventAction).to(CreateAction).inSingletonScope();
container.bind<UpdateAction>(TYPES.UpdateEventAction).to(UpdateAction).inSingletonScope();
container.bind<DeleteAction>(TYPES.DeleteEventAction).to(DeleteAction).inSingletonScope();
container.bind<UpdateComponentParentAction>(TYPES.UpdateComponentParentEventAction).to(UpdateComponentParentAction).inSingletonScope();
container.bind<PublishTemplateAction>(TYPES.PublishTemplateEventAction).to(PublishTemplateAction).inSingletonScope();
container.bind<UnsupportedAction>(TYPES.UnsupportedEventAction).to(UnsupportedAction).inSingletonScope();

// for 3rd party objects, we need to use factory injectors
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
