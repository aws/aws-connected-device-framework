/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import { SubscriptionDao } from '../subscriptions/subscription.dao';
import { EventDao } from '../events/event.dao';
import {
    TargetItem,
    TargetTypeStrings,
    EmailTargetItem,
    SMSTargetItem,
    DynamodDBTargetItem,
    PushTargetItem,
} from './targets.models';
import { EventItem } from '../events/event.models';
import { EmailTarget } from './processors/email.target';
import { DynamodDBTarget } from './processors/dynamodb.target';
import { SMSTarget } from './processors/sms.target';
import { PushTarget } from './processors/push.target';
import { SubscriptionItem } from '../subscriptions/subscription.models';
import { TargetDao } from './target.dao';

@injectable()
export class TargetService {
    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.EventDao) private eventDao: EventDao,
        @inject(TYPES.TargetDao) private targetDao: TargetDao,
        @inject(TYPES.EmailTarget) private emailTarget: EmailTarget,
        @inject(TYPES.DynamodDBTarget) private dynamodbTarget: DynamodDBTarget,
        @inject(TYPES.SMSTarget) private smsTarget: SMSTarget,
        @inject(TYPES.PushTarget) private pushTarget: PushTarget
    ) {}

    public async get(subscriptionId: string): Promise<SubscriptionItem> {
        logger.debug(`target.service get: in: subscriptionId:${subscriptionId}`);

        ow(subscriptionId, ow.string.nonEmpty);

        throw new Error('TODO!');
    }
    public async delete(
        subscriptionId: string,
        targetType: TargetTypeStrings,
        targetId: string,
        unsubscribe: boolean
    ): Promise<void> {
        logger.debug(
            `target.service delete: in: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}, unsubscribe:${unsubscribe}`
        );

        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        // retrieve the existing target
        const existing = await this.targetDao.get(subscriptionId, targetType, targetId);
        if (existing === undefined) {
            throw new Error('NOT_FOUND');
        }

        // 1st handle unsubscribing the specific target
        if (unsubscribe) {
            switch (targetType) {
                case 'email':
                    await this.emailTarget.delete((existing as EmailTargetItem).subscriptionArn);
                    break;
                case 'push_gcm':
                case 'push_adm':
                case 'push_apns':
                    await this.pushTarget.delete((existing as PushTargetItem).subscriptionArn);
                    break;
                case 'sms':
                    await this.smsTarget.delete((existing as SMSTargetItem).subscriptionArn);
                    break;
                case 'dynamodb':
                    // nothing to unsubscribe from
                    break;
                case 'mqtt':
                    throw new Error('NOT_IMPLEMENTED');
                default:
                    throw new Error('UNSUPPORTED_TARGET_TYPE');
            }
        }

        // 2nd remove it from the database
        await this.targetDao.delete(subscriptionId, targetType, targetId);

        logger.debug(`target.service delete: exit:`);
    }

    private async getSubscription(id: string): Promise<SubscriptionItem> {
        const subscription = await this.subscriptionDao.get(id);
        if (subscription === undefined) {
            throw new Error('SUBSCRIPTION_NOT_FOUND');
        }
        return subscription;
    }

    private async getEvent(id: string): Promise<EventItem> {
        const event = await this.eventDao.get(id);
        if (event === undefined) {
            throw new Error('EVENT_NOT_FOUND');
        }
        return event;
    }

    public async create(
        item: TargetItem,
        topicArn?: string,
        principalValue?: string,
        event?: EventItem,
        skipDao?: boolean
    ): Promise<CreateTargetResponse> {
        logger.debug(
            `target.service create: in: item:${JSON.stringify(
                item
            )}, topicArn:${topicArn}, principalValue:${principalValue}, event:${JSON.stringify(
                event
            )}, skipDao:${skipDao}`
        );

        // validate input
        ow(item, ow.object.nonEmpty);
        ow(item.subscriptionId, ow.string.nonEmpty);
        ow(item.targetType, ow.string.nonEmpty);

        // retrieve the topicArn if not provided
        let subscription;
        if (topicArn === undefined) {
            subscription = await this.getSubscription(item.subscriptionId);
            topicArn = subscription.sns?.topicArn;
        }

        // retrieve the principalValue if not provided
        if (principalValue === undefined) {
            if (subscription === undefined) {
                subscription = await this.getSubscription(item.subscriptionId);
            }
            principalValue = subscription.principalValue;
        }

        // retrieve the event if not provided
        if (event === undefined) {
            if (subscription === undefined) {
                subscription = await this.getSubscription(item.subscriptionId);
            }
            event = await this.getEvent(subscription.event.id);
        }

        // verify target is allowed. if so, create it.
        switch (item.targetType) {
            case 'email':
                ow(event.supportedTargets.email, ow.string.nonEmpty);
                await this.emailTarget.create(item as EmailTargetItem, topicArn);
                break;
            case 'sms':
                ow(event.supportedTargets.sms, ow.string.nonEmpty);
                await this.smsTarget.create(item as SMSTargetItem, topicArn);
                break;
            case 'mqtt':
                ow(event.supportedTargets.mqtt, ow.string.nonEmpty);
                // TODO:
                break;
            case 'dynamodb':
                ow(event.supportedTargets.dynamodb, ow.string.nonEmpty);
                await this.dynamodbTarget.ensureTableExists(
                    (item as DynamodDBTargetItem).tableName
                );
                break;
            case 'push_gcm':
                ow(event.supportedTargets.push_gcm, ow.string.nonEmpty);
                await this.pushTarget.create(item as PushTargetItem, topicArn);
                break;
            case 'push_adm':
                ow(event.supportedTargets.push_adm, ow.string.nonEmpty);
                await this.pushTarget.create(item as PushTargetItem, topicArn);
                break;
            case 'push_apns':
                ow(event.supportedTargets.push_apns, ow.string.nonEmpty);
                await this.pushTarget.create(item as PushTargetItem, topicArn);
                break;
            default:
                throw new Error('UNSUPPORTED_TARGET_TYPE');
        }

        // save the target info (may be skipped if called from a subscription dao for efficieny)
        if (!skipDao) {
            await this.targetDao.create(
                item,
                event.eventSourceId,
                event.principal,
                principalValue
            );
        }

        const res: CreateTargetResponse = {
            subscriptionId: item.subscriptionId,
            targetType: item.targetType,
            targetId: item.getId(),
        };
        logger.debug(`targetDao.service create: exit:${JSON.stringify(res)}`);
        return res;
    }

    public async update(item: TargetItem): Promise<void> {
        logger.debug(`target.service update: in: item:${JSON.stringify(item)}`);

        // validate input
        ow(item, ow.object.nonEmpty);
        ow(item.subscriptionId, ow.string.nonEmpty);
        ow(item.targetType, ow.string.nonEmpty);

        await this.targetDao.update(item);
    }
}

export interface CreateTargetResponse {
    subscriptionId: string;
    targetType: TargetTypeStrings;
    targetId: string;
}
