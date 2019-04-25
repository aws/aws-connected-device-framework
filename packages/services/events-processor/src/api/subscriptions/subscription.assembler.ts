/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../../utils/logger';
import { SubscriptionItem, SubscriptionResource } from './subscription.models';
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
            }
        };

        if (subscription.targets) {
            item.targets= {};
            if (subscription.targets.sns) {
                item.targets.sns = {
                    arn: subscription.targets.sns.arn
                };
            }
            if (subscription.targets.iotCore) {
                item.targets.iotCore = {
                    topic: subscription.targets.iotCore.topic
                };
            }
        }

        logger.debug(`subscription.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:SubscriptionItem): SubscriptionResource {
        logger.debug(`subscription.assembler toRe: in: re:${JSON.stringify(item)}`);

        const resource:SubscriptionResource = {
            subscriptionId: item.id,
            userId: item.user.id,
            eventId: item.event.id,
            principalValue: item.principalValue,
            ruleParameterValues: item.ruleParameterValues,
            alerted: item.alerted,
            enabled: item.enabled
        };

        if (item.targets) {
            if (item.targets.sns) {
                resource.targets.sns = {
                    arn: item.targets.sns.arn
                };
            }
            if (item.targets.iotCore) {
                resource.targets.iotCore = {
                    topic: item.targets.iotCore.topic
                };
            }
        }

        logger.debug(`subscription.assembler toRe: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
