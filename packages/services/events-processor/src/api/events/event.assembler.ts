/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger.util';
import { EventItem, EventResource, EventResourceList, EventConditionsUtils } from './event.models';
import { PaginationKey } from '../subscriptions/subscription.dao';
import { TYPES } from '../../di/types';

@injectable()
export class EventAssembler {

    constructor( @inject(TYPES.EventConditionsUtils) private ecu: EventConditionsUtils) {}

    public toItem(resource:EventResource, principal:string): EventItem {
        logger.debug(`event.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item:EventItem = {
            id: resource.eventId,
            eventSourceId: resource.eventSourceId,
            name: resource.name,
            principal,
            conditions: resource.conditions,
            ruleParameters: this.ecu.extractParameters(resource.conditions),
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

    public toResourceList(items:EventItem[], count?:number, paginateFrom?:PaginationKey): EventResourceList {
        logger.debug(`subscription.assembler toResourceList: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list:EventResourceList= {
            results:[]
        };

        if (count!==undefined || paginateFrom!==undefined) {
            list.pagination = {
                offset: {
                    eventSourceId: paginateFrom.eventSourceId,
                    eventId: paginateFrom.eventId
                },
                count
            };
        }

        items.forEach(i=> list.results.push(this.toResource(i)));

        logger.debug(`subscription.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

}
