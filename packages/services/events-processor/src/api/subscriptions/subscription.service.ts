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
import { SubscriptionItem } from './subscription.models';
import { SubscriptionAssembler } from './subscription.assembler';
import { SubscriptionDao, PaginationKey } from './subscription.dao';
import { EventDao } from '../events/event.dao';
import { SNSTarget } from '../targets/processors/sns.target';
import { TargetService } from '../targets/target.service';
import { TargetItem, TargetTypeStrings, TargetItemBase } from '../targets/targets.models';
import { ListSubscriptionsByTopicResponse } from 'aws-sdk/clients/sns';

@injectable()
export class SubscriptionService  {

    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.SubscriptionAssembler) private subscriptionAssembler: SubscriptionAssembler,
        @inject(TYPES.TargetService) private targetService: TargetService,
        @inject(TYPES.SNSTarget) private snsTarget: SNSTarget) {
    }

    public async get(subscriptionId:string) : Promise<SubscriptionItem> {
        logger.debug(`subscription.service get: in: subscriptionId:${subscriptionId}`);

        ow(subscriptionId, ow.string.nonEmpty);

        const subscription  = await this.subscriptionDao.get(subscriptionId);
        if (subscription===undefined) {
            throw new Error('NOT_FOUND');
        }

        // some types of sns subscriptions (such as email) require confirmation by the end point owner
        // within 72 hrs. If we know of any being in a pending state, double-check its status to see if
        // it has been confirmed or automatically deleted.

        let existingSnsSubscriptions:ListSubscriptionsByTopicResponse;
        const targetTypes:TargetTypeStrings[] = ['email', 'sms'];
        for(const targetType of targetTypes) {
            const targets = subscription.targets?.[targetType] ?? [];
            for(let i=targets.length-1; i>=0; i--) {
                const target = subscription.targets[targetType][i];
                const snsSubscriptionArn = target['subscriptionArn'];
                logger.debug(`>>>>> snsSubscriptionArn:${snsSubscriptionArn}`);
                if (!this.snsTarget.isPendingConfirmation(snsSubscriptionArn)) {
                    continue;
                }
                if (existingSnsSubscriptions===undefined) {
                    existingSnsSubscriptions = await this.snsTarget.listSubscriptions(subscription.sns?.topicArn);
                }
                const matches = existingSnsSubscriptions.Subscriptions?.filter(s=> s.Endpoint===target.getId());
                if (matches?.length > 0) {
                    // update with latest info if different to what we have
                    const latestArn = matches[0].SubscriptionArn;
                    if (latestArn!==target['subscriptionArn']) {
                        target['subscriptionArn'] = matches[0].SubscriptionArn;
                        await this.targetService.update(target);
                    }
                } else {
                    // NOTE: as pending subscriptions do not appear in the subscription list, we
                    // cannot deterimine if it needs to be removed due to being expired.
                }
            }
        }

        logger.debug(`subscription.service get: exit: model: ${JSON.stringify(subscription)}`);
        return subscription;
    }

    /**
     * List all target subscriptionArn's (SNS subscription Arn's) used across all subscriptions
     * for a given user, optionally excluding a specific subscription.
     * @param userId
     * @param excludeSubscriptionId
     */
    public async listSnsTargetArns(userId:string, excludeSubscriptionId?:string) : Promise<Set<string>> {
        logger.debug(`subscription.service listTargetArns: in: userId:${userId}, excludeSubscriptionId:${excludeSubscriptionId}`);

        let subscriptions = await this.listByUser(userId);
        if (excludeSubscriptionId!==undefined) {
            subscriptions = subscriptions.filter(s=> s.id!==excludeSubscriptionId);
        }
        const targetArns = new Set( subscriptions
            .map( s=> Object.keys(s.targets)
                        .map(tt=> s.targets[tt])
                        .flat())
            .flat()
            .map(t=> t['subscriptionArn'])
            .filter(arn=> arn!==undefined));

        logger.debug(`subscription.service listTargetArns: exit:${JSON.stringify(targetArns)}`);
        return targetArns;
    }

    public async delete(subscriptionId:string) : Promise<void> {
        logger.debug(`subscription.service delete: in: subscriptionId:${subscriptionId}`);

        ow(subscriptionId, ow.string.nonEmpty);

        const current = await this.subscriptionDao.get(subscriptionId);
        if (current===undefined) {
            throw new Error('NOT_FOUND');
        }

        // safe delete targets
        if(current?.targets) {
            for(const targetType of Object.keys(current.targets)) {
                const targets = current.targets[targetType];
                if (targets) {
                    for(const t of targets) {
                        await this.safeDeleteTarget(subscriptionId, targetType as TargetTypeStrings, (t as TargetItemBase).getId());
                    }
                }
            }
        }

        // delete the subscription config
        await this.subscriptionDao.delete(subscriptionId);

        // delete the sns topic if there are no remaining subscriptions for the user
        const subscriptions = await this.listByUser(current.user.id);
        if (subscriptions===undefined || subscriptions.filter(s=> s.id!==subscriptionId).length===0) {
            await this.snsTarget.deleteTopic(current.user.id);
        }

        logger.debug(`subscription.service delete: exit:`);
    }

    /**
     * Targets may be reused across multiple subscriptions. This `safeDeleteTarget()` method verifies first whether the
     * target is reused across another subscription for the user associated with the susbcription in context. the deletion
     * of the target itself is delegated to the `TargetService`.
     * @param subscriptionId
     * @param targetType
     * @param targetId
     */
    public async safeDeleteTarget(subscriptionId:string, targetType:TargetTypeStrings, targetId:string) : Promise<void> {
        logger.debug(`subscription.service safeDeleteTarget: in: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}`);

        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        const subscription = await this.get(subscriptionId);
        if (subscription===undefined) {
            throw new Error('SUBSCRIPTION_NOT_FOUND');
        }

        const target = subscription.targets?.[targetType]?.flat().filter(t=> t.getId()===targetId)?.[0];
        if (target===undefined) {
            throw new Error('TARGET_NOT_FOUND');
        }

        // some targets (such as mobile push targets) may be used across multiple
        // subscriptions. These ones we can delete the target data but must not clean
        // up SNS as their target subscriptionArns may be reused.
        // 1st figure out what sns targets are being used on other subscriptions
        const otherTargetArns = await this.listSnsTargetArns(subscription.user.id, subscriptionId);

        // 2nd now that we know which targets are used across other subscriptions, we can exclude cleaning them up
        const reused = (target['subscriptionArn']!==undefined && otherTargetArns.has(target['subscriptionArn']));

        // 3rd we can now go ahead and safely delegate the deletion of the target
        this.targetService.delete(subscriptionId, targetType, targetId, !reused);

        logger.debug(`subscription.service safeDeleteTarget: exit:`);

    }

    public async listByUser(userId:string) : Promise<SubscriptionItem[]> {
        logger.debug(`subscription.service listByUser: in: userId:${userId}`);

        ow(userId, ow.string.nonEmpty);

        let results:SubscriptionItem[];
        const subscriptionIds  = await this.subscriptionDao.listSubscriptionIdsForUser(userId);
        if (subscriptionIds?.length>0) {
            results= [];
            for(const id of subscriptionIds) {
                results.push(await this.get(id));
            }
        }
        logger.debug(`subscription.service listByUser: exit: model: ${JSON.stringify(results)}`);
        return results;
    }

    public async listByEvent(eventId:string, from?:PaginationKey) : Promise<[SubscriptionItem[], PaginationKey]> {
        logger.debug(`subscription.service listByEvent: in: eventId:${eventId}, from:${JSON.stringify(from)}`);

        ow(eventId, ow.string.nonEmpty);

        const [results, pagintion] = await this.subscriptionDao.listSubscriptionsForEvent(eventId, from);

        logger.debug(`subscription.service listByEvent: exit: model: ${JSON.stringify(results)}`);
        return [results, pagintion];
    }

    public async create(item:SubscriptionItem) : Promise<string> {
        logger.debug(`subscription.service create: in: model:${JSON.stringify(item)}`);

        // validate input
        ow(item, ow.object.nonEmpty);
        ow(item.user, ow.object.nonEmpty);
        ow(item.user.id, ow.string.nonEmpty);
        ow(item.event, ow.object.nonEmpty);
        ow(item.event.id, ow.string.nonEmpty);
        ow(item.principalValue, ow.string.nonEmpty);

        // set defaults
        item.id = uuid();
        item.alerted=false;
        if (item.enabled===undefined) {
            item.enabled=true;
        }

        // verify the provided event exists
        const event = await this.eventDao.get(item.event.id);
        logger.debug(`subscription.service create: event: ${JSON.stringify(event)}`);
        if (event===undefined) {
            throw new Error('EVENT_NOT_FOUND');
        }

        // add the event info to the item
        this.subscriptionAssembler.augmentItem(item, event);

        // verify that all required ruleParameterValues have been provided
        if (event.ruleParameters?.length>0) {
            ow(item.ruleParameterValues, ow.object.nonEmpty);
            ow(item.ruleParameterValues, ow.object.hasKeys(...event.ruleParameters));
        }

        // verify that a subscription for the user/principalValue does not already exist
        const existing = await this.subscriptionDao.listSubscriptionIdsForEventUserPrincipal(event.eventSourceId, event.id, event.principal, item.principalValue, item.user.id);
        if (existing?.length>0) {
            logger.debug(`subscription.service create: subscription ${existing[0]} already exists for this event/user/principal`);
            throw new Error('SUBSCRIPTION_FOR_USER_PRINCIPAL_ALREADY_EXISTS');
        }

        // create sns topic
        const topicArn = await this.snsTarget.initTopic(item.user.id);
        item.sns = {topicArn};

        // create the targets
        for(const targetType of Object.keys(item.targets)) {
            const targets = item.targets[targetType];
            if (targets) {
                for(const target of targets) {
                    (target as TargetItem).subscriptionId = item.id;
                    await this.targetService.create(target, topicArn, item.principalValue, event, true);
                }
            }
        }

        // save the subscription info
        await this.subscriptionDao.create(item);

        logger.debug(`subscription.service create: exit:${item.id}`);
        return item.id;

    }

    public async update(updated:SubscriptionItem) : Promise<void> {
        logger.debug(`subscription.service update: in: updated:${JSON.stringify(updated)}`);

        // validate input
        ow(updated, ow.object.nonEmpty);
        ow(updated.id, ow.string.nonEmpty);
        ow(updated.principalValue, ow.undefined);
        ow(updated.event, ow.undefined);
        ow(updated.eventSource, ow.undefined);
        ow(updated.user, ow.undefined);
        ow(updated.sns, ow.undefined);
        ow(updated.targets, ow.undefined);
        ow(updated.enabled, ow.undefined);
        ow(updated.alerted, ow.undefined);

        // retrieve current
        const existing = await this.get(updated.id);
        if (existing===undefined) {
            throw new Error('NOT_FOUND');
        }

        // merge changes
        const merged = Object.assign({}, existing, updated);

        // retrieve event details
        const event = await this.eventDao.get(merged.event.id);

        // verify that all required ruleParameterValues have been provided
        if (event?.ruleParameters) {
            ow(merged.ruleParameterValues, ow.object.nonEmpty);
            ow(merged.ruleParameterValues, ow.object.hasKeys(...event.ruleParameters));
        }

        // save the subscription info
        await this.subscriptionDao.update(merged);

        logger.debug(`subscription.service update: exit:`);

    }

}
