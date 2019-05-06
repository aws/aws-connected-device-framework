/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
