/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger';
import ow from 'ow';
import { EmailTarget } from './email.target';
import { SubscriptionItem } from '../subscription.models';

@injectable()
export class TargetService  {

    public constructor(
        @inject(TYPES.EmailTarget) private emailTarget: EmailTarget) {}

    public async processTargets(sub:SubscriptionItem) : Promise<void> {
        logger.debug(`target.service processTargets: in: sub:${JSON.stringify(sub)}`);

        ow(sub.user.id, ow.string.nonEmpty);

        if (sub.targets===undefined) {
            logger.debug(`target.service processTargets: exit: no targets`);
            return;
        }

        let topicArn;
        if (sub.targets.email!==undefined) {
            topicArn = await this.emailTarget.create(sub.user.id, sub.targets.email);
        }

        if (topicArn!==undefined) {
            sub.sns= {topicArn:topicArn};
        }

        // TODO: add other supported targets

        logger.debug(`target.service processTargets`);
    }

}
