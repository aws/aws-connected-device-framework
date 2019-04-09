/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { EventSourceItem, EventSourceDetailResource } from './eventsource.models';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class EventSourceAssembler {

    public toItem(resource:EventSourceDetailResource): [EventSourceItem, string] {
        logger.debug(`eventsource.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item:EventSourceItem = {
            pk: createDelimitedAttribute(PkType.EventSource, resource.eventSourceId),
            sk: createDelimitedAttribute(PkType.EventSource, resource.eventSourceId),
            sourceType: resource.sourceType,
            principal: resource.principal,
            enabled: resource.enabled,
            tableName: resource.tableName
        };

        const typeGsiSort = createDelimitedAttribute(PkType.EventSource, resource.enabled, resource.eventSourceId);

        logger.debug(`eventsource.assembler toItem: exit: ${[JSON.stringify(item),typeGsiSort]}`);
        return [item, typeGsiSort];
    }

    public toResource(item:EventSourceItem): EventSourceDetailResource {
        logger.debug(`eventsource.assembler toResource: in: resource:${JSON.stringify(item)}`);

        const resource:EventSourceDetailResource = {
            eventSourceId: expandDelimitedAttribute(item.pk)[1],
            principal: item.principal,
            sourceType: item.sourceType,
            enabled: item.enabled,
            tableName: item.tableName
        };

        logger.debug(`eventsource.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
