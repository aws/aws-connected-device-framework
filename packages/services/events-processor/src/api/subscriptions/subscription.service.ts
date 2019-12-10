/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger.util';
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import { SubscriptionResource, SubscriptionResourceList } from './subscription.models';
import { SubscriptionAssembler } from './subscription.assembler';
import { SubscriptionDao, PaginationKey } from './subscription.dao';
import { TargetService } from './targets/target.service';
import { EventDao } from '../events/event.dao';

@injectable()
export class SubscriptionService  {

    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.SubscriptionAssembler) private subscriptionAssembler: SubscriptionAssembler,
        @inject(TYPES.TargetService) private targetService: TargetService) {
        }

    public async get(subscriptionId:string) : Promise<SubscriptionResource> {
        logger.debug(`subscription.service get: in: subscriptionId:${subscriptionId}`);

        ow(subscriptionId, ow.string.nonEmpty);

        const result  = await this.subscriptionDao.get(subscriptionId);

        let model:SubscriptionResource;
        if (result!==undefined) {
            model = this.subscriptionAssembler.toResource(result);
        }

        logger.debug(`subscription.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }
    public async delete(subscriptionId:string) : Promise<void> {
        logger.debug(`subscription.service delete: in: subscriptionId:${subscriptionId}`);

        ow(subscriptionId, ow.string.nonEmpty);

        const current  = await this.subscriptionDao.get(subscriptionId);

        await this.targetService.deleteTargets(current);

        await this.subscriptionDao.delete(subscriptionId);

        logger.debug(`subscription.service delete: exit:`);
    }

    public async listByUser(userId:string) : Promise<SubscriptionResourceList> {
        logger.debug(`subscription.service listByUser: in: userId:${userId}`);

        ow(userId, ow.string.nonEmpty);

        const results  = await this.subscriptionDao.listSubscriptionsForUser(userId);

        let model:SubscriptionResourceList;
        if (results!==undefined) {
            model = this.subscriptionAssembler.toResourceList(results);
        }

        logger.debug(`subscription.service listByUser: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async listByEvent(eventId:string, from?:PaginationKey) : Promise<SubscriptionResourceList> {
        logger.debug(`subscription.service listByEvent: in: eventId:${eventId}, from:${JSON.stringify(from)}`);

        ow(eventId, ow.string.nonEmpty);

        const results = await this.subscriptionDao.listSubscriptionsForEvent(eventId, from);

        let model:SubscriptionResourceList;
        if (results!==undefined) {
            model = this.subscriptionAssembler.toResourceList(results[0], results[1]);
        }

        logger.debug(`subscription.service listByEvent: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async create(resource:SubscriptionResource) : Promise<string> {
        logger.debug(`subscription.service create: in: model:${JSON.stringify(resource)}`);

        // validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.user, ow.object.nonEmpty);
        ow(resource.user.id, ow.string.nonEmpty);
        ow(resource.event, ow.object.nonEmpty);
        ow(resource.event.id, ow.string.nonEmpty);
        ow(resource.principalValue, ow.string.nonEmpty);
        if (resource.targets!==undefined) {
            if (resource.targets.email!==undefined) {
                ow(resource.targets.email.address, ow.string.nonEmpty);
            }
            if (resource.targets.sms!==undefined) {
                ow(resource.targets.sms.phoneNumber, ow.string.nonEmpty);
            }
            if (resource.targets.mqtt!==undefined) {
                ow(resource.targets.mqtt.topic, ow.string.nonEmpty);
            }
            if (resource.targets.dynamodb!==undefined) {
                ow(resource.targets.dynamodb.tableName, ow.string.nonEmpty);
                ow(resource.targets.dynamodb.attributeMapping, ow.object.nonEmpty);
            }
        }

        // set defaults
        resource.id = uuid();
        resource.alerted=false;
        if (resource.enabled===undefined) {
            resource.enabled=true;
        }

        // verify the provided event exists
        const event = await this.eventDao.get(resource.event.id);
        logger.debug(`subscription.service create: event: ${JSON.stringify(event)}`);
        if (event===undefined) {
            throw new Error('EVENT_NOT_FOUND');
        }

        // verify that the subscribed targets are supported for the event
        if (resource.targets!==undefined) {
            if (resource.targets.email!==undefined) {
                ow(event.supportedTargets.email, ow.string.nonEmpty);
            }
            if (resource.targets.sms!==undefined) {
                ow(event.supportedTargets.sms, ow.string.nonEmpty);
            }
            if (resource.targets.mqtt!==undefined) {
                ow(event.supportedTargets.mqtt, ow.string.nonEmpty);
            }
            if (resource.targets.dynamodb!==undefined) {
                ow(event.supportedTargets.dynamodb, ow.string.nonEmpty);
            }
        }

        // verify that all required ruleParameterValues have been provided
        if (event.ruleParameters) {
            ow(resource.ruleParameterValues, ow.object.nonEmpty);
            ow(resource.ruleParameterValues, ow.object.hasKeys(...event.ruleParameters));
        }

        const item = this.subscriptionAssembler.toItem(resource, event);

        // create the targets
        await this.targetService.processTargets(item);

        // save the subscription info
        await this.subscriptionDao.create(item);

        logger.debug(`subscription.service create: exit:${item.id}`);
        return item.id;

    }

}
