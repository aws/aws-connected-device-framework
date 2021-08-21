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
import {logger} from '../../utils/logger.util';
import { EventSourceItem, EventSourceDetailResource } from './eventsource.models';

@injectable()
export class EventSourceAssembler {

    public toItem(resource:EventSourceDetailResource): EventSourceItem {
        logger.debug(`eventsource.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item:EventSourceItem = {
            id: resource.id,
            name: resource.name,
            sourceType: resource.sourceType,
            principal: resource.principal,
            enabled: resource.enabled,
            dynamoDb: resource.dynamoDb,
            iotCore: resource.iotCore
        };

        logger.debug(`eventsource.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:EventSourceItem): EventSourceDetailResource {
        logger.debug(`eventsource.assembler toResource: in: resource:${JSON.stringify(item)}`);

        const resource:EventSourceDetailResource = {
            id: item.id,
            name: item.name,
            principal: item.principal,
            sourceType: item.sourceType,
            enabled: item.enabled,
            dynamoDb: item.dynamoDb,
            iotCore: item.iotCore
        };

        logger.debug(`eventsource.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
