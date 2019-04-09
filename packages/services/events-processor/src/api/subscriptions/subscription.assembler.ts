/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This  code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger';
import { SubscriptionItem, SubscriptionResource } from './subscription.models';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute } from '../../utils/pkUtils';

@injectable()
export class SubscriptionAssembler {

    constructor(
        @inject('aws.dynamoDb.tables.eventConfig.partitions') private eventConfigPartitions:number) {
    }

    public toItem(resource:SubscriptionResource, eventSourceId:string, principal:string): [SubscriptionItem,string,string,string] {
        logger.debug(`subscription.assembler toItem: in: resource:${JSON.stringify(resource)}, eventSourceId:${eventSourceId}`);

        const item:SubscriptionItem = {
            pk: createDelimitedAttribute(PkType.Subscription, resource.subscriptionId),
            sk: createDelimitedAttribute(PkType.Subscription, resource.subscriptionId),
            userId: resource.userId,
            ruleParameterValues: resource.ruleParameterValues,
            enabled: resource.enabled,
            alerted: resource.alerted,
            gsiBucket: `${Math.floor(Math.random() * this.eventConfigPartitions)}`,
            gsi2Sort: createDelimitedAttribute(PkType.Event, resource.enabled, resource.subscriptionId),
            gsi3Sort: createDelimitedAttribute(PkType.EventSource, eventSourceId, principal, resource.subscriptionId)

        };

        const typeGsiSort = createDelimitedAttribute(PkType.Subscription, resource.enabled, resource.subscriptionId);
        const userGsiSk = createDelimitedAttribute(PkType.User, resource.userId);
        const userGsiSort = createDelimitedAttribute(PkType.Subscription, resource.enabled, resource.subscriptionId);

        logger.debug(`subscription.assembler toItem: exit: ${[JSON.stringify(item),typeGsiSort]}`);
        return [item, typeGsiSort, userGsiSk, userGsiSort];
    }

    public toResource(item:SubscriptionItem): SubscriptionResource {
        logger.debug(`subscription.assembler toRe: in: re:${JSON.stringify(item)}`);

        const resource:SubscriptionResource = {
            subscriptionId: expandDelimitedAttribute(item.pk)[1],
            userId: item.userId,
            eventId: expandDelimitedAttribute(item.gsi2Sort)[1],
            ruleParameterValues: item.ruleParameterValues,
            alerted: item.alerted,
            enabled: item.enabled
        };

        logger.debug(`subscription.assembler toRe: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }
}
