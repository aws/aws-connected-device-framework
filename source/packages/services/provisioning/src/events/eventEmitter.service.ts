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
import {logger} from '../utils/logger';
import { TYPES } from '../di/types';
import AWS = require('aws-sdk');
import config from 'config';

@injectable()
export class EventEmitter {

    private _sns: AWS.SNS;

    public constructor(
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS
    ) {
        this._sns = snsFactory();
    }

    public async fire(event:EventInfo): Promise<void> {
        logger.debug(`eventEmitter.service fire: in: event:${JSON.stringify(event)}`);

        const topic = config.get(`events.${event.type}.topic`) as string;
        if (topic===undefined || topic.length===0) {
            return;
        }

        const params = {
            Message: JSON.stringify(event),
            TopicArn: topic
        };

        await this._sns.publish(params).promise();
        logger.debug('eventEmitter.service exit:');
    }
}

export interface EventInfo {
    objectId: string;
    type: Type;
    event: Event;
    payload?: string;
    attributes?: {[key: string]: string};
}

export enum Type {
    certificatesBatch = 'certificatesBatch'
}

export enum Event {
    started, complete
}
