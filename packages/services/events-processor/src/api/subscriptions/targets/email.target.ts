/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { EmailSubscriptionConfig } from '../subscription.models';
import { SNSTarget } from './sns.target';

@injectable()
export class EmailTarget extends SNSTarget  {

    private readonly PROTOCOL='email';

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
            super(region, accountId, snsFactory);
    }

    public async create(userId:string, config:EmailSubscriptionConfig) : Promise<string> {
        logger.debug(`email.target create: in: userId:${userId}, config:${JSON.stringify(config)}`);

        // validate input
        ow(userId, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.address, ow.string.nonEmpty);

        // create the topic if it does not already exist
        const topicArn = await super.initTopic(userId);

        await super.subscribe(this.PROTOCOL, topicArn, config.address);

        logger.debug(`email.target create: exit:${topicArn}`);
        return topicArn;

    }

    public async delete(userId:string) : Promise<void> {
        logger.debug(`email.target delete: in: userId:${userId}`);

        // validate input
        ow(userId, ow.string.nonEmpty);

        const topicArn = super.topicArn(userId);

        await super.unsubscribe(this.PROTOCOL, topicArn);

        logger.debug(`email.target delete: exit:${topicArn}`);

    }
}
