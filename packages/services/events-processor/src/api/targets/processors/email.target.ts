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
import { EmailTargetItem } from '../targets.models';

@injectable()
export class EmailTarget extends SNSTarget implements SNSTargetCreation {

    private readonly PROTOCOL='email';

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
            super(region, accountId, snsFactory);
    }

    public async create(config:EmailTargetItem, topicArn:string) : Promise<string> {
        logger.debug(`email.target create: in: config:${JSON.stringify(config)}, topicArn:${topicArn}`);

        // validate input
        ow(config, ow.object.nonEmpty);
        ow(config.address, ow.string.nonEmpty);

        const subscriptionArn = await super.subscribe(this.PROTOCOL, topicArn, config.address);
        config.subscriptionArn = subscriptionArn;

        logger.debug(`email.target create: exit:${config.address}`);
        return config.address;

    }
}
