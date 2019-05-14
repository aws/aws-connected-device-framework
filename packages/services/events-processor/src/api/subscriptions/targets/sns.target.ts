/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';

@injectable()
export class SNSTarget  {

    readonly TOPIC_PREFIX = 'cdf-events-';

    private _sns:AWS.SNS;

    public constructor(
        @inject('aws.region') private region:string,
        @inject('aws.accountId') private accountId:string,
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS
    ) {
        this._sns = snsFactory();
    }

    protected async initTopic(userId:string) : Promise<string> {
        logger.debug(`sns.target initTopic: in: userId:${userId}`);

        // validate input
        ow(userId, ow.string.nonEmpty);

        // see if a topic already exists
        const arn=this.topicArn(userId);
        const exists = await this.topicExists(arn);
        if (!exists) {
            // if not, create it
            await this.createTopic(userId);
        }

        logger.debug(`sns.target initTopic: exit:${arn}`);
        return arn;
    }

    private topicName(userId:string) {
        return `${this.TOPIC_PREFIX}${escape(userId)}`;
    }

    protected topicArn(userId:string) {
        return `arn:aws:sns:${this.region}:${this.accountId}:${this.topicName(userId)}`;
    }

    private async topicExists(topicArn:string) : Promise<boolean> {
        logger.debug(`sns.target topicExists: in: topicArn:${topicArn}`);
        const params:AWS.SNS.Types.GetTopicAttributesInput = {
             TopicArn:topicArn
        };
        let exists = false;
        try {
            await this._sns.getTopicAttributes(params).promise();
            exists = true;
        } catch (err) {
            // ignore
        }
        logger.debug(`sns.target topicExists: exit:${exists}`);
        return exists;
    }

    protected async subscriptions(topicArn:string):Promise<AWS.SNS.SubscriptionsList> {
        logger.debug(`sns.target subscriptions: in: topicArn:${topicArn}`);
        const params:AWS.SNS.Types.ListSubscriptionsByTopicInput = {
             TopicArn:topicArn
        };
        let subscriptions:AWS.SNS.SubscriptionsList= [];
        try {
            subscriptions = (await this._sns.listSubscriptionsByTopic(params).promise()).Subscriptions;
        } catch (err) {
            // ignore
        }
        logger.debug(`sns.target subscriptions: exit:${JSON.stringify(subscriptions)}`);
        return subscriptions;
    }

    private async createTopic(userId:string) {
        logger.debug(`sns.target createTopic: in: userId:${userId}`);
        const params:AWS.SNS.CreateTopicInput = {
            Name: this.topicName(userId)
        };
        await this._sns.createTopic(params).promise();
        logger.debug(`sns.target createTopic: exit:`);
    }

    public async deleteTopic(userId:string) {
        logger.debug(`sns.target deleteTopic: in: userId:${userId}`);
        const params:AWS.SNS.DeleteTopicInput = {
            TopicArn: this.topicArn(userId)
        };
        await this._sns.deleteTopic(params).promise();
        logger.debug(`sns.target deleteTopic: exit:`);
    }

    protected async subscribe(protocol:string, topicArn:string, endpoint:string) : Promise<void> {
        logger.debug(`sns.target subscribe: in: protocol:${protocol}, topicArn:${topicArn}, endpoint:${endpoint}`);

        const exists = await this.subscriptionExists(topicArn, protocol);
        if (exists) {
            logger.warn(`sns.target subscribe: ${protocol} target for ${topicArn} already exists!`);
            return;
        }

        const params:AWS.SNS.Types.SubscribeInput = {
            Protocol: protocol,
            TopicArn: topicArn,
            Endpoint: endpoint
        };
        await this._sns.subscribe(params).promise();
        logger.debug(`sns.target subscribe: exit:`);
    }

    protected async unsubscribe(protocol:string, topicArn:string) : Promise<void> {
        logger.debug(`sns.target unsubscribe: in: protocol:${protocol}, topicArn:${topicArn}`);

        const subscriptions = await this.subscriptions(topicArn);
        const subscriptionArn:string[] = subscriptions.filter(s=> s.Protocol===protocol).map(s=> s.SubscriptionArn);

        if (subscriptionArn===undefined || subscriptionArn.length===0) {
            logger.warn(`sns.target unsubscribe: ${protocol} target for ${topicArn} does not exist!`);
            return;
        }

        const params:AWS.SNS.Types.UnsubscribeInput = {
            SubscriptionArn: subscriptionArn[0]
        };
        await this._sns.unsubscribe(params).promise();

        logger.debug(`sns.target unsubscribe: exit:`);
    }

    protected async subscriptionExists(topicArn:string, protocol:string) : Promise<boolean> {
        logger.debug(`sns.target subscriptionExists: in: topicArn:${topicArn}:, protocol:${protocol}`);
        const subscriptions = await this.subscriptions(topicArn);
        const exists =  subscriptions.filter(s=> s.Protocol===protocol).length>0;
        logger.debug(`sns.target subscriptionExists: exit:${exists}`);
        return exists;
    }

}
