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
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { TargetItem, TargetTypeStrings } from '../targets.models';
import { ListSubscriptionsByTopicInput, ListSubscriptionsByTopicResponse } from 'aws-sdk/clients/sns';

export interface SNSTargetCreation {
    create(config:TargetItem, topicArn:string) : Promise<string>;
    delete(subscriptionArn:string) : Promise<void>;
}

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

    public isSnsTarget(targetType:TargetTypeStrings) : boolean {
        logger.debug(`sns.target isSnsTarget: in: targetType:${targetType}`);
        let result:boolean;
        switch(targetType) {
            case 'sms':
            case 'email':
            case 'push_adm':
            case 'push_apns':
            case 'push_gcm':
                result = true;
                break;
            default:
                result=false;
        }
        logger.debug(`sns.target isSnsTarget: exit:${result}`);
        return result;
    }

    public async delete(subscriptionArn:string) : Promise<void> {
        logger.debug(`sns.target delete: in: subscriptionArn:${subscriptionArn}`);

        // validate input
        ow(subscriptionArn, ow.string.nonEmpty);

        // pending confirmations cannot be deleted
        if (this.isPendingConfirmation(subscriptionArn)) {
            return;
        }

        await this.unsubscribe(subscriptionArn);

        logger.debug(`sns.target delete: exit:`);

    }

    public isPendingConfirmation(subscriptionArn:string) : boolean {
        return subscriptionArn.split(' ').join('').toLowerCase()==='pendingconfirmation';
    }

    public async initTopic(userId:string) : Promise<string> {
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

    protected topicArn(userId:string) : string {
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

    public async deleteTopic(userId:string): Promise<void> {
        logger.debug(`sns.target deleteTopic: in: userId:${userId}`);
        const params:AWS.SNS.DeleteTopicInput = {
            TopicArn: this.topicArn(userId)
        };
        await this._sns.deleteTopic(params).promise();
        logger.debug(`sns.target deleteTopic: exit:`);
    }

    public async listSubscriptions(topicArn:string) : Promise<ListSubscriptionsByTopicResponse> {
        logger.debug(`sns.target listSubscriptions: in: topicArn:${topicArn}`);
        const params: ListSubscriptionsByTopicInput = {
            TopicArn: topicArn
        };
        const existing = await this._sns.listSubscriptionsByTopic(params).promise();
        logger.debug(`sns.target listSubscriptions: exit:${JSON.stringify(existing)}`);
        return existing;
    }

    protected async subscribe(protocol:string, topicArn:string, endpoint:string) : Promise<string> {
        logger.debug(`sns.target subscribe: in: protocol:${protocol}, topicArn:${topicArn}, endpoint:${endpoint}`);

        const params:AWS.SNS.Types.SubscribeInput = {
            Protocol: protocol,
            TopicArn: topicArn,
            Endpoint: endpoint
        };
        const res = await this._sns.subscribe(params).promise();
        logger.debug(`sns.target subscribe: exit: ${res.SubscriptionArn}`);
        return res.SubscriptionArn;
    }

    protected async unsubscribe(subscriptionArn:string) : Promise<void> {
        logger.debug(`sns.target unsubscribe: in: subscriptionArn:${subscriptionArn}`);

        const params:AWS.SNS.Types.UnsubscribeInput = {
            SubscriptionArn: subscriptionArn
        };
        await this._sns.unsubscribe(params).promise();

        logger.debug(`sns.target unsubscribe: exit:`);
    }

}
