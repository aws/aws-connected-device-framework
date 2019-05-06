/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { SMSSubscriptionConfig } from '../subscription.models';
import { SNSTarget } from './sns.target';

@injectable()
export class SMSTarget extends SNSTarget  {

    private readonly PROTOCOL='sms';

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
            super(region, accountId, snsFactory);
    }

    public async create(userId:string, config:SMSSubscriptionConfig) : Promise<string> {
        logger.debug(`sms.target create: in: userId:${userId}, config:${JSON.stringify(config)}`);

        // validate input
        ow(userId, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.phoneNumber, ow.string.nonEmpty);

        // create the topic if it does not already exist
        const topicArn = await super.initTopic(userId);

       await super.subscribe(this.PROTOCOL, topicArn, config.phoneNumber);

        logger.debug(`sms.target create: exit:${topicArn}`);
        return topicArn;

    }

    public async delete(userId:string) : Promise<void> {
        logger.debug(`sms.target delete: in: userId:${userId}`);

        // validate input
        ow(userId, ow.string.nonEmpty);

        const topicArn = super.topicArn(userId);

        await super.unsubscribe(this.PROTOCOL, topicArn);

        logger.debug(`sms.target delete: exit:${topicArn}`);

    }

}
