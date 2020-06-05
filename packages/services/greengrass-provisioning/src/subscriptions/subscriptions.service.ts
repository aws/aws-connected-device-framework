/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { GreengrassSubscriptionItem} from './subscriptions.models';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger.util';
import ow from 'ow';
import { GreengrassUtils } from '../utils/greengrass.util';
import { GroupsDao } from '../groups/groups.dao';

@injectable()
export class SubscriptionsService {

    constructor(
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject(TYPES.GreengrassUtils) private ggUtils: GreengrassUtils) {}

    public async updateSubscriptionDefinition(groupName:string, add:GreengrassSubscriptionItem[], remove:string[]) {
        logger.debug(`subscriptions.service updateSubscriptionDefinition: in: groupName:${groupName}, add:${JSON.stringify(add)}, remove:${JSON.stringify(remove)}`);

        ow(groupName, ow.string.nonEmpty);
        if (add!==undefined) {
            for (const s of add) {
                ow(s.id, 'Subscription Id', ow.string.nonEmpty);
                ow(s.source, 'Subscription Source', ow.string.nonEmpty);
                ow(s.subject, 'Subscription Subject', ow.string.nonEmpty);
                ow(s.target, 'Subscription Target', ow.string.nonEmpty);
            }
        }

        // retrieve the greengrass info
        const group = await this.groupsDao.get(groupName);
        if (group===undefined) {
            throw new Error('NOT_FOUND');
        }
        const groupInfo = await this.ggUtils.getGroupInfo(group.id);
        const versionInfo = await this.ggUtils.getGroupVersionInfo(groupInfo.Id, groupInfo.LatestVersion);

        // create the new subscription definition
        const updatedSubscriptionsVersionArn = await this.createSubscriptionDefinitionVersion(versionInfo.SubscriptionDefinitionVersionArn, add, remove);

        // save the group details, ready for deployment
        if (updatedSubscriptionsVersionArn!==undefined) {
            const updatedGroupVersionId = await this.ggUtils.createGroupVersion(groupInfo.Id, versionInfo, undefined, undefined, updatedSubscriptionsVersionArn);
            group.deployed = false;
            group.versionId = updatedGroupVersionId;
            group.versionNo = group.versionNo + 1;
            await this.groupsDao.saveGroup(group);
        }

        logger.debug(`subscriptions.service updateSubscriptionDefinition: exit:`);

    }

    public async createSubscriptionDefinitionVersion(subscriptionDefinitionVersionArn:string, add:GreengrassSubscriptionItem[], remove:string[]) : Promise<string> {
        logger.debug(`subscriptions.service createSubscriptionDefinitionVersion: in: subscriptionDefinitionVersionArn:${subscriptionDefinitionVersionArn}, add:${JSON.stringify(add)}, remove:${JSON.stringify(remove)}`);

        if (add!==undefined) {
            for (const s of add) {
                ow(s.id, 'Subscription Id', ow.string.nonEmpty);
                ow(s.source, 'Subscription Source', ow.string.nonEmpty);
                ow(s.subject, 'Subscription Subject', ow.string.nonEmpty);
                ow(s.target, 'Subscription Target', ow.string.nonEmpty);
            }
        }

        const subscriptionsInfo = await this.ggUtils.getSubscriptionInfo(subscriptionDefinitionVersionArn);

        let subscriptionInfoChanged:boolean=false;

        // remove any requested
        if (remove!==undefined) {
            subscriptionsInfo.Subscriptions = subscriptionsInfo.Subscriptions.filter(s=> !remove.includes(s.Id));
            subscriptionInfoChanged=true;
        }

        if (add!==undefined) {
            // remove any existing subscriptions where we have a subscription to update with the same id
            const newIds = add.map(s=> s.id);
            subscriptionsInfo.Subscriptions = subscriptionsInfo.Subscriptions.filter(s=> !newIds.includes(s.Id));

            // add all the new ones
            subscriptionsInfo.Subscriptions.push(... add.map(s=> {
                return {Id:s.id, Source:s.source, Subject:s.subject, Target:s.target};
            }));
            subscriptionInfoChanged=true;
        }

        // create a new defintion version if needed
        let updatedSubscriptionsVersionArn;
        if (subscriptionInfoChanged) {
            updatedSubscriptionsVersionArn = await this.ggUtils.createSubscriptionDefinitionVersion(subscriptionDefinitionVersionArn, subscriptionsInfo);
        }

        logger.debug(`subscriptions.service createSubscriptionDefinitionVersion: exit: ${updatedSubscriptionsVersionArn}`);
        return updatedSubscriptionsVersionArn;
    }

}
