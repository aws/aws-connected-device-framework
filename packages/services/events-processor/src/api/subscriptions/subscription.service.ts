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
import { SubscriptionResource } from './subscription.models';
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

    public async create(resource:SubscriptionResource) : Promise<void> {
        logger.debug(`subscription.full.service create: in: model:${JSON.stringify(resource)}`);

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

        // verify the provided event
        const event = await this.eventService.get(resource.eventId);
        logger.debug(`subscription.full.service create: event: ${JSON.stringify(event)}`);
        if (event===undefined) {
            throw new Error('EVENT_NOT_FOUND');
        }

        // TODO: extract ruleParameterValues against the event

        const item = this.subscriptionAssembler.toItem(resource, event);

        // create the targets
        await this.targetService.processTargets(item);

        // save the subscription info
        await this.subscriptionDao.create(item);

        logger.debug(`subscription.full.service create: exit:`);

    }

}
