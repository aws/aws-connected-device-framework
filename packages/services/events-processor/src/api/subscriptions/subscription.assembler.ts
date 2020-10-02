/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger.util';
import { SubscriptionItem, SubscriptionResourceList, SubscriptionBaseResource, SubscriptionV1Resource, SubscriptionV2Resource } from './subscription.models';
import {TargetAssembler} from '../targets/target.assembler';
import { EventItem } from '../events/event.models';
import { PaginationKey } from './subscription.dao';
import { TYPES } from '../../di/types';
import { SNSTarget } from '../targets/processors/sns.target';

@injectable()
export class SubscriptionAssembler {

    constructor( @inject(TYPES.TargetAssembler) private targetAssembler: TargetAssembler,
        @inject(TYPES.SNSTarget) private snsTarget: SNSTarget) {
    }

    public augmentItem(item:SubscriptionItem, event:EventItem) : void {

        item.event = {
            id: event.id,
            name: event.name,
            conditions: event.conditions,
            disableAlertThreshold: event.disableAlertThreshold
        };

        item.eventSource = {
            id: event.eventSourceId,
            principal: event.principal
        };
    }

    public toItem(resource:SubscriptionBaseResource, version:string): SubscriptionItem {
        logger.debug(`subscription.assembler toItem: in: resource:${JSON.stringify(resource)}, version:${version}`);

        const item:SubscriptionItem = {
            id: resource.id,

            principalValue: resource.principalValue,
            ruleParameterValues: resource.ruleParameterValues,
            enabled: resource.enabled,
            alerted: resource.alerted,

            event: {
                id: resource.event?.id
            },

            user: {
                id: resource.user?.id
            }
        };

        if (version.startsWith('1.')) {
            // v1 specific...
            const asV1 = resource as SubscriptionV1Resource;
            item.targets = {
                dynamodb: [ this.targetAssembler.toItem(resource.id, asV1.targets?.dynamodb, 'dynamodb')],
                email: [ this.targetAssembler.toItem(resource.id, asV1.targets?.email, 'email')],
                mqtt: [ this.targetAssembler.toItem(resource.id, asV1.targets?.mqtt, 'mqtt')],
                push_gcm: [ this.targetAssembler.toItem(resource.id, asV1.targets?.push_gcm, 'push_gcm')],
                push_adm: [ this.targetAssembler.toItem(resource.id, asV1.targets?.push_adm, 'push_adm')],
                push_apns: [ this.targetAssembler.toItem(resource.id, asV1.targets?.push_apns, 'push_apns')],
                sms: [ this.targetAssembler.toItem(resource.id, asV1.targets?.sms, 'sms')]
            };

        } else {
            // v2 specific...
            const asV2 = resource as SubscriptionV2Resource;
            item.targets = {
                dynamodb: this.targetAssembler.toItems(resource.id, asV2.targets?.dynamodb, 'dynamodb'),
                email: this.targetAssembler.toItems(resource.id, asV2.targets?.email, 'email'),
                mqtt: this.targetAssembler.toItems(resource.id, asV2.targets?.mqtt, 'mqtt'),
                push_gcm: this.targetAssembler.toItems(resource.id, asV2.targets?.push_gcm, 'push_gcm'),
                push_adm: this.targetAssembler.toItems(resource.id, asV2.targets?.push_adm, 'push_adm'),
                push_apns: this.targetAssembler.toItems(resource.id, asV2.targets?.push_apns, 'push_apns'),
                sms: this.targetAssembler.toItems(resource.id, asV2.targets?.sms, 'sms')
            };
        }

        logger.debug(`subscription.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public toResource(item:SubscriptionItem, version:string): SubscriptionBaseResource {
        logger.debug(`subscription.assembler toResource: in: item:${JSON.stringify(item)}, version:${version}`);

        let resource:SubscriptionBaseResource;
        if (version.startsWith('1.')) {
            // v1 specific...
            if (item.targets?.dynamodb?.length>1 ||
                item.targets?.email?.length>1 || item.targets?.mqtt?.length>1 ||
                item.targets?.push_gcm?.length>1 || item.targets?.sms?.length>1||
                item.targets?.push_adm?.length>1 || item.targets?.push_apns?.length>1) {
                throw new Error ('INVALID_RESOURCE_VERSION');
            }
            resource = new SubscriptionV1Resource();
            const asV1 = resource as SubscriptionV1Resource;
            asV1.targets = {
                dynamodb: this.targetAssembler.toResource(item.targets?.dynamodb[0]),
                email: this.targetAssembler.toResource(item.targets?.email[0]),
                mqtt: this.targetAssembler.toResource(item.targets?.mqtt[0]),
                push_gcm: this.targetAssembler.toResource(item.targets?.push_gcm[0]),
                push_adm: this.targetAssembler.toResource(item.targets?.push_adm[0]),
                push_apns: this.targetAssembler.toResource(item.targets?.push_apns[0]),
                sms: this.targetAssembler.toResource(item.targets?.sms[0]),
            };

            if (asV1.targets?.email) {
                if (this.snsTarget.isPendingConfirmation(asV1.targets.email.subscriptionArn)) {
                    asV1.targets.email.subscriptionArn = 'Pending confirmation';
                }
            }

        } else {
            // v2 specific...
            resource = new SubscriptionV2Resource();
            const asV2 = resource as SubscriptionV2Resource;
            asV2.targets = {
                dynamodb: this.targetAssembler.toResources(item.targets?.dynamodb),
                email: this.targetAssembler.toResources(item.targets?.email),
                mqtt: this.targetAssembler.toResources(item.targets?.mqtt),
                push_gcm: this.targetAssembler.toResources(item.targets?.push_gcm),
                push_adm: this.targetAssembler.toResources(item.targets?.push_adm),
                push_apns: this.targetAssembler.toResources(item.targets?.push_apns),
                sms: this.targetAssembler.toResources(item.targets?.sms),
            };

            if (asV2.targets?.email) {
                asV2.targets.email.forEach(t=> {
                    if (this.snsTarget.isPendingConfirmation(t.subscriptionArn)) {
                        t.subscriptionArn = 'Pending confirmation';
                    }
                });
            }
        }

        // common properties
        Object.keys(item).forEach(key=> {
            if (key!=='targets') {
                resource[key] = item[key];
            }
        });

        logger.debug(`subscription.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:SubscriptionItem[], version:string, paginationFrom?:PaginationKey): SubscriptionResourceList {
        logger.debug(`subscription.assembler toResourceList: in: items:${JSON.stringify(items)}, version:${version}, paginationFrom:${JSON.stringify(paginationFrom)}`);

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

        items?.forEach(i=> list.results.push(this.toResource(i, version)));

        logger.debug(`subscription.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

}
