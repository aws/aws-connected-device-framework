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
import { ExpressionParser, ExpressionSanitizer } from '../../utils/expression.util';

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
            supportedTargets: resource.supportedTargets,
            templateProperties: this.extractTemplateProperties(resource.templates)
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
            supportedTargets: item.supportedTargets,
            templateProperties: item.templateProperties
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

    private extractTemplateProperties(templateMap: {[key: string]: string}) : string[] {
        logger.debug(`event.assembler extractTemplateProperties: in: templateMap:${JSON.stringify(templateMap)}`);

        let templateProperties:string[] = [];

        if(templateMap) {
            // Iterate over all templates
            Object.keys(templateMap).forEach(k => {
                const template = templateMap[k];
                // Sanitize each template
                const expressionSanitizer = new ExpressionSanitizer(template);
                const sanitizedExpression = expressionSanitizer.sanitize();

                // parse and extract keys for each template
                const expressionParser = new ExpressionParser(sanitizedExpression);

                templateProperties = templateProperties.concat(expressionParser.extractKeys());

            });
        }
        // clear duplicates
        templateProperties = templateProperties.filter((v, i, a) => a.indexOf(v) === i);

        logger.debug(`event.assembler extractTemplateProperties: out: templateProperties:${JSON.stringify(templateProperties)}`);
        // Return list of all keys within all templates
        return templateProperties;
    }

}
