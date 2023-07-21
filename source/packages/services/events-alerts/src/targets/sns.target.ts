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
import { TYPES } from '../di/types';
import AWS = require('aws-sdk');

@injectable()
export class SNSTarget {
    private _sns: AWS.SNS;

    public constructor(@inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
        this._sns = snsFactory();
    }

    public async send(topicArn: string, subject: string, messages: SNSMessages): Promise<void> {
        logger.debug(
            `sns.target send: in: topicArn:${topicArn}, subject:${subject}, messages:${JSON.stringify(
                messages.toJson()
            )}`
        );

        const params: AWS.SNS.Types.PublishInput = {
            TopicArn: topicArn,
            Subject: subject,
            Message: JSON.stringify(messages.toJson()),
            MessageStructure: 'json',
        };

        try {
            await this._sns.publish(params).promise();
        } catch (err) {
            logger.error(`sns.target send: failed:${err}`);
        }

        logger.debug('sns.target send: exit:');
    }
}

export class SNSMessages {
    default = '';
    email?: string;
    emailJson?: string;
    http?: string;
    https?: string;
    sqs?: string;
    GCM?: string;
    ADM?: string;
    APNS?: string;

    public toJson(): unknown {
        return {
            default: this.default,
            email: this.email,
            'email - json': this.emailJson,
            http: this.http,
            https: this.https,
            sqs: this.sqs,
            GCM: this.GCM,
            ADM: this.ADM,
            APNS: this.APNS,
        };
    }

    public hasMessage(): boolean {
        return (
            this.default !== undefined ||
            this.email !== undefined ||
            this.emailJson !== undefined ||
            this.http !== undefined ||
            this.https !== undefined ||
            this.sqs !== undefined ||
            this.GCM !== undefined ||
            this.ADM !== undefined ||
            this.APNS !== undefined
        );
    }
}
