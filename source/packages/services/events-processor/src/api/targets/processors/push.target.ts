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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../../../di/types';
import { PushTargetItem } from '../targets.models';
import { SNSTarget, SNSTargetCreation } from './sns.target';

@injectable()
export class PushTarget extends SNSTarget implements SNSTargetCreation {
    private readonly PROTOCOL = 'application';
    private sns: AWS.SNS;

    constructor(
        @inject('aws.region') region: string,
        @inject('aws.accountId') accountId: string,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS,
    ) {
        super(region, accountId, snsFactory);
        this.sns = snsFactory();
    }

    public async create(config: PushTargetItem, topicArn: string): Promise<string> {
        logger.debug(
            `push.target create: in: config:${JSON.stringify(config)}, topicArn:${topicArn}`,
        );

        // validate input
        ow(topicArn, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.platformApplicationArn, ow.string.nonEmpty);
        ow(config.token, ow.string.nonEmpty);

        // TODO: do we already have a platform arn created for the provided token? if so, skip it

        // get platform endpoint arn
        // the docs (https://docs.aws.amazon.com/cli/latest/reference/sns/create-platform-endpoint.html) state that this call is idempotent:
        const res = await this.sns
            .createPlatformEndpoint({
                PlatformApplicationArn: config.platformApplicationArn,
                Token: config.token,
            })
            .promise();

        // create the subscription
        const subscriptionArn = await super.subscribe(this.PROTOCOL, topicArn, res.EndpointArn);

        config.platformEndpointArn = res.EndpointArn;
        config.subscriptionArn = subscriptionArn;

        logger.debug(`push.target create: exit:${config.platformEndpointArn}`);
        return config.platformEndpointArn;
    }
}
