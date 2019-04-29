/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { SubscriptionItem, SubscriptionResource, SubscriptionResourceList } from './subscription.models';
import { EventResource } from '../events/event.models';

@injectable()
export class SubscriptionAssembler {

    public toItem(subscription:SubscriptionResource, event:EventResource): SubscriptionItem {
        logger.debug(`subscription.assembler toItem: in: subscription:${JSON.stringify(subscription)}, event:${JSON.stringify(event)}`);

        const item:SubscriptionItem = {
            id: subscription.subscriptionId,

            principalValue: subscription.principalValue,
            ruleParameterValues: subscription.ruleParameterValues,
            enabled: subscription.enabled,
            alerted: subscription.alerted,

            event: {
                id: subscription.eventId,
                name: event.name,
                conditions: event.conditions
            },

            eventSource: {
                id: event.eventSourceId,
                principal: event.principal
            },

            user: {
                id: subscription.userId
            },

            targets: subscription.targets
        };

        logger.debug(`subscription.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:SubscriptionItem): SubscriptionResource {
        logger.debug(`subscription.assembler toResource: in: re:${JSON.stringify(item)}`);

        const resource:SubscriptionResource = {
            subscriptionId: item.id,
            principalValue: item.principalValue,
            ruleParameterValues: item.ruleParameterValues,
            alerted: item.alerted,
            enabled: item.enabled,
            targets: item.targets
        };

        if (item.event) {
            resource.eventId = item.event.id;
        }

        if (item.user) {
            resource.userId = item.user.id;
        }

        logger.debug(`subscription.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:SubscriptionItem[]): SubscriptionResourceList {
        logger.debug(`subscription.assembler toResourceList: in: items:${JSON.stringify(items)}`);

        const list:SubscriptionResourceList= {
            results:[]
        };

        items.forEach(i=> list.results.push(this.toResource(i)));

        logger.debug(`subscription.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

}
