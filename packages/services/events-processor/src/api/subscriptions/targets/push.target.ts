import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import {PushSubscriptionConfig} from '../subscription.models';
import { SNSTarget } from './sns.target';

@injectable()
export class PushTarget extends SNSTarget {
    private readonly PROTOCOL='application';
    private sns: AWS.SNS;

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
        super(region, accountId, snsFactory);
        this.sns = snsFactory();
    }

    public async create(userId:string, config:PushSubscriptionConfig) : Promise<string> {
        logger.debug(`push.target create: in: userId:${userId}, config:${JSON.stringify(config)}}`);

        // validate input
        ow(userId, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.platformApplicationArn, ow.string.nonEmpty);
        ow(config.token, ow.string.nonEmpty);

        // create the topic if it does not already exist
        const topicArn = await super.initTopic(userId);
        logger.debug(`snsTopicArn : ${topicArn}`);

        // get platform endpoint arn
        // the docs (https://docs.aws.amazon.com/cli/latest/reference/sns/create-platform-endpoint.html) state that this call is idempotent:
        const res = await this.sns.createPlatformEndpoint({
            PlatformApplicationArn: config.platformApplicationArn,
            Token: config.token
        }).promise();
        const platformEndppointArn = res.EndpointArn;

        // create the subscription
        await super.subscribe(this.PROTOCOL, topicArn, platformEndppointArn);
        logger.debug(`push.target create: exit:${topicArn}`);
        return topicArn;
    }

    public async delete(userId:string) : Promise<void> {
        logger.debug(`push.target delete: in: userId:${userId}`);

        // validate input
        ow(userId, ow.string.nonEmpty);

        const topicArn = super.topicArn(userId);

        await super.unsubscribe(this.PROTOCOL, topicArn);

        logger.debug(`push.target delete: exit:${topicArn}`);

    }
}
