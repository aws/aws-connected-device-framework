/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { SubscriptionItem, SubscriptionResource } from './subscription.models';

@injectable()
export class SubscriptionAssembler {

    public toItem(resource:SubscriptionResource, eventSourceId:string, principal:string, ruleDefinition:string): SubscriptionItem {
        logger.debug(`subscription.assembler toItem: in: resource:${JSON.stringify(resource)}, eventSourceId:${eventSourceId}`);

        const item:SubscriptionItem = {
            id: resource.subscriptionId,

            ruleParameterValues: resource.ruleParameterValues,
            enabled: resource.enabled,
            alerted: resource.alerted,

            event: {
                id: resource.eventId,
                ruleDefinition
            },

            eventSource: {
                id: eventSourceId,
                principal
            },

            user: {
                id: resource.userId
            }
        };

        logger.debug(`subscription.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:SubscriptionItem): SubscriptionResource {
        logger.debug(`subscription.assembler toRe: in: re:${JSON.stringify(item)}`);

        const resource:SubscriptionResource = {
            subscriptionId: item.id,
            userId: item.user.id,
            eventId: item.event.id,
            ruleParameterValues: item.ruleParameterValues,
            alerted: item.alerted,
            enabled: item.enabled
        };

        logger.debug(`subscription.assembler toRe: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
