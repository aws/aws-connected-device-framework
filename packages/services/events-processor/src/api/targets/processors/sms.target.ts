/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { SNSTarget, SNSTargetCreation } from './sns.target';
import { SMSTargetItem } from '../targets.models';

@injectable()
export class SMSTarget extends SNSTarget implements SNSTargetCreation {

    private readonly PROTOCOL='sms';

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
            super(region, accountId, snsFactory);
    }

    public async create(config:SMSTargetItem, topicArn:string) : Promise<string> {
        logger.debug(`sms.target create: in: config:${JSON.stringify(config)}, topicArn:${topicArn}`);

        // validate input
        ow(topicArn, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.phoneNumber, ow.string.nonEmpty);

        const subscriptionArn = await super.subscribe(this.PROTOCOL, topicArn, config.phoneNumber);

        config.subscriptionArn = subscriptionArn;

        logger.debug(`sms.target create: exit:${config.phoneNumber}`);
        return config.phoneNumber;

    }
}
