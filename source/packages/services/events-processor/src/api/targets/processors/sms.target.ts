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
import { TYPES } from '../../../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import { SNSTarget, SNSTargetCreation } from './sns.target';
import { SMSTargetItem } from '../targets.models';

@injectable()
export class SMSTarget extends SNSTarget implements SNSTargetCreation {
    private readonly PROTOCOL = 'sms';

    constructor(
        @inject('aws.region') region: string,
        @inject('aws.accountId') accountId: string,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS,
    ) {
        super(region, accountId, snsFactory);
    }

    public async create(config: SMSTargetItem, topicArn: string): Promise<string> {
        logger.debug(
            `sms.target create: in: config:${JSON.stringify(config)}, topicArn:${topicArn}`,
        );

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
