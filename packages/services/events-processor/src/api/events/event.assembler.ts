/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { EventItem, EventResource } from './event.models';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class EventAssembler {

    public toItem(resource:EventResource, principal:string): [EventItem,string] {
        logger.debug(`event.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item:EventItem = {
            pk: createDelimitedAttribute(PkType.EventSource, resource.eventSourceId),
            sk: createDelimitedAttribute(PkType.Event, resource.eventId),
            gsi1Sort: createDelimitedAttribute(PkType.Event, resource.eventId, resource.eventSourceId),
            name: resource.name,
            principal,
            ruleDefinition: resource.ruleDefinition,
            ruleParameters: resource.ruleParameters,
            enabled: resource.enabled
        };

        const typeGsiSort = createDelimitedAttribute(PkType.Event, resource.enabled, resource.eventId);

        logger.debug(`event.assembler toItem: exit: ${[JSON.stringify(item),typeGsiSort]}`);
        return [item, typeGsiSort];
    }

    public toResource(item:EventItem): EventResource {
        logger.debug(`event.assembler toRe: in: re:${JSON.stringify(item)}`);

        const resource:EventResource = {
            eventId: expandDelimitedAttribute(item.sk)[1],
            eventSourceId: expandDelimitedAttribute(item.pk)[1],
            name: item.name,
            ruleDefinition: item.ruleDefinition,
            ruleParameters: item.ruleParameters,
            enabled: item.enabled,
            principal: item.principal

        };

        logger.debug(`event.assembler toRe: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
