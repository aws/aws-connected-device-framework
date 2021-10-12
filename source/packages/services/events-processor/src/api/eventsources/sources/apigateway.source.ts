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
import { injectable } from 'inversify';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import { EventSourceDetailResource } from '../eventsource.models';
import { EventSource } from './source.interface';

@injectable()
export class ApiGatewayEventSource implements EventSource  {

    public async create(model:EventSourceDetailResource) : Promise<void> {
        logger.debug(`apigateway.source create in: model:${JSON.stringify(model)}`);

        ow(model, ow.object.nonEmpty);
        ow(model.principal, ow.string.nonEmpty);
        ow(model.apigateway, ow.object.nonEmpty);
        ow(model.apigateway.attributes, ow.object.nonEmpty);

        // assign a unique event source id
        if (model.id===undefined) {
            model.id=uuid();
        }

        logger.debug(`apigateway.source create: exit:`);
    }

    public async delete(eventSourceId:string) : Promise<void> {
        logger.debug(`apigateway.source delete: in: eventSourceId:${eventSourceId}`);

        logger.debug(`apigateway.source delete: exit:`);
    }

}
