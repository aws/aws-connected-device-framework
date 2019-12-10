/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { EmailTarget } from './email.target';
import { SubscriptionItem } from '../subscription.models';
import { SMSTarget } from './sms.target';
import { SNSTarget } from './sns.target';
import { DynamodDBTarget } from './dynamodb.target';

@injectable()
export class TargetService  {

    public constructor(
        @inject(TYPES.SNSTarget) private snsTarget: SNSTarget,
        @inject(TYPES.EmailTarget) private emailTarget: EmailTarget,
        @inject(TYPES.DynamodDBTarget) private dynamodbTarget: DynamodDBTarget,
        @inject(TYPES.SMSTarget) private smsTarget: SMSTarget) {}

    public async processTargets(sub:SubscriptionItem) : Promise<void> {
        logger.debug(`target.service processTargets: in: sub:${JSON.stringify(sub)}`);

        ow(sub.user.id, ow.string.nonEmpty);

        if (sub.targets===undefined) {
            logger.debug(`target.service processTargets: exit: no targets`);
            return;
        }

        let snsTopicArn;
        let dynamodbTableName;
        let dynamodbAttributeMapping;
        if (sub.targets.email!==undefined) {
            snsTopicArn = await this.emailTarget.create(sub.user.id, sub.targets.email);
        }
        if (sub.targets.sms!==undefined) {
            snsTopicArn = await this.smsTarget.create(sub.user.id, sub.targets.sms);
        }
        if (sub.targets.dynamodb!== undefined) {
            dynamodbTableName = await this.dynamodbTarget.validateTarget(sub.targets.dynamodb.tableName);
            dynamodbAttributeMapping = sub.targets.dynamodb.attributeMapping;
        }

        if (snsTopicArn!==undefined) {
            sub.sns= {topicArn:snsTopicArn};
        }

        if (dynamodbTableName!==undefined) {
            sub.dynamodb = {tableName: dynamodbTableName, attributeMapping: dynamodbAttributeMapping};
        }

        // TODO: add other supported targets

        logger.debug(`target.service processTargets: exit:`);
    }

    public async deleteTargets(sub:SubscriptionItem) : Promise<void> {
        logger.debug(`target.service deleteTargets: in: sub:${JSON.stringify(sub)}`);

        ow(sub.user.id, ow.string.nonEmpty);

        if (sub.targets===undefined) {
            logger.debug(`target.service deleteTargets: exit: no targets`);
            return;
        }

        await this.snsTarget.deleteTopic(sub.user.id);

        // TODO: delete other supported (non-sns) targets

        logger.debug(`target.service deleteTargets: exit:`);
    }

}
