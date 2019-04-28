/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { EventItem, EventResource } from './event.models';

@injectable()
export class EventAssembler {

    public toItem(resource:EventResource, principal:string): EventItem {
        logger.debug(`event.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item:EventItem = {
            id: resource.eventId,
            eventSourceId: resource.eventSourceId,
            name: resource.name,
            principal,
            conditions: resource.conditions,
            ruleParameters: resource.ruleParameters,
            enabled: resource.enabled,
            templates: resource.templates,
            supportedTargets: resource.supportedTargets
        };
        logger.debug(`event.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:EventItem): EventResource {
        logger.debug(`event.assembler toRe: in: re:${JSON.stringify(item)}`);

        const resource:EventResource = {
            eventId: item.id,
            eventSourceId: item.eventSourceId,
            name: item.name,
            conditions: item.conditions,
            ruleParameters: item.ruleParameters,
            enabled: item.enabled,
            principal: item.principal,
            templates: item.templates,
            supportedTargets: item.supportedTargets
        };

        logger.debug(`event.assembler toRe: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
