/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger.util';
import { SubscriptionItem, SubscriptionResource, SubscriptionResourceList } from './subscription.models';
import { EventItem } from '../events/event.models';
import { PaginationKey } from './subscription.dao';

@injectable()
export class SubscriptionAssembler {

    public toItem(resource:SubscriptionResource, event:EventItem): SubscriptionItem {
        logger.debug(`subscription.assembler toItem: in: resource:${JSON.stringify(resource)}, event:${JSON.stringify(event)}`);

        const item:SubscriptionItem = {
            id: resource.id,

            principalValue: resource.principalValue,
            ruleParameterValues: resource.ruleParameterValues,
            enabled: resource.enabled,
            alerted: resource.alerted,

            event: {
                id: resource.event.id,
                name: event.name,
                conditions: event.conditions
            },

            eventSource: {
                id: event.eventSourceId,
                principal: event.principal
            },

            user: {
                id: resource.user.id
            },

            targets: resource.targets
        };

        logger.debug(`subscription.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:SubscriptionItem): SubscriptionResource {
        logger.debug(`subscription.assembler toResource: in: item:${JSON.stringify(item)}`);

        const resource:SubscriptionResource = {
            id: item.id,
            principalValue: item.principalValue,
            ruleParameterValues: item.ruleParameterValues,
            alerted: item.alerted,
            enabled: item.enabled,
            targets: item.targets
        };

        if (item.event) {
            resource.event = {
                id: item.event.id,
                name: item.event.name,
                conditions: item.event.conditions
            };
        }

        if (item.user) {
            resource.user = {
                id: item.user.id
            };
        }

        logger.debug(`subscription.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:SubscriptionItem[], paginationFrom?:PaginationKey): SubscriptionResourceList {
        logger.debug(`subscription.assembler toResourceList: in: items:${JSON.stringify(items)}, paginationFrom:${JSON.stringify(paginationFrom)}`);

        const list:SubscriptionResourceList= {
            results:[]
        };

        if (paginationFrom!==undefined) {
            list.pagination= {
                offset: {
                    eventId: paginationFrom.gsi1Sort,
                    subscriptionId: paginationFrom.sk
                }
            };
        }

        items.forEach(i=> list.results.push(this.toResource(i)));

        logger.debug(`subscription.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

}
