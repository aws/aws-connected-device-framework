import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { SNSTarget, SNSTargetCreation } from './sns.target';
import { PushTargetItem } from '../targets.models';

@injectable()
export class PushTarget extends SNSTarget implements SNSTargetCreation {
    private readonly PROTOCOL='application';
    private sns: AWS.SNS;

    constructor(
        @inject('aws.region') region:string,
        @inject('aws.accountId') accountId:string,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
        super(region, accountId, snsFactory);
        this.sns = snsFactory();
    }

    public async create(config:PushTargetItem, topicArn:string) : Promise<string> {
        logger.debug(`push.target create: in: config:${JSON.stringify(config)}, topicArn:${topicArn}`);

        // validate input
        ow(topicArn, ow.string.nonEmpty);
        ow(config, ow.object.nonEmpty);
        ow(config.platformApplicationArn, ow.string.nonEmpty);
        ow(config.token, ow.string.nonEmpty);

        // TODO: do we already have a platform arn created for the provided token? if so, skip it

        // get platform endpoint arn
        // the docs (https://docs.aws.amazon.com/cli/latest/reference/sns/create-platform-endpoint.html) state that this call is idempotent:
        const res = await this.sns.createPlatformEndpoint({
            PlatformApplicationArn: config.platformApplicationArn,
            Token: config.token
        }).promise();

        // create the subscription
        const subscriptionArn = await super.subscribe(this.PROTOCOL, topicArn, res.EndpointArn);

        config.platformEndpointArn = res.EndpointArn;
        config.subscriptionArn = subscriptionArn;

        logger.debug(`push.target create: exit:${config.platformEndpointArn}`);
        return config.platformEndpointArn;
    }

}
