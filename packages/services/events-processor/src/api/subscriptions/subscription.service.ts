/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger';
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import { SubscriptionResource, SubscriptionResourceList } from './subscription.models';
import { SubscriptionAssembler } from './subscription.assembler';
import { SubscriptionDao } from './subscription.dao';
import { EventService } from '../events/event.service';
import { TargetService } from './targets/target.service';

@injectable()
export class SubscriptionService  {

    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.EventService) private eventService: EventService,
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

    public async create(resource:SubscriptionResource) : Promise<void> {
        logger.debug(`subscription.service create: in: model:${JSON.stringify(resource)}`);

        // validate input
        ow(resource, ow.object.nonEmpty);
        ow(resource.userId, ow.string.nonEmpty);
        ow(resource.eventId, ow.string.nonEmpty);
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
        }

        // set defaults
        resource.subscriptionId = uuid();
        resource.alerted=false;
        if (resource.enabled===undefined) {
            resource.enabled=true;
        }

        // verify the provided event exists
        const event = await this.eventService.get(resource.eventId);
        logger.debug(`subscription.service create: event: ${JSON.stringify(event)}`);
        if (event===undefined) {
            throw new Error('EVENT_NOT_FOUND');
        }

        // verify that the subscribed targets are supports for the event
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
        }

        // TODO: validate that all requried ruleParameterValues have been provided

        const item = this.subscriptionAssembler.toItem(resource, event);

        // create the targets
        await this.targetService.processTargets(item);

        // save the subscription info
        await this.subscriptionDao.create(item);

        logger.debug(`subscription.service create: exit:`);

    }

}
