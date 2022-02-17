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
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import AWS = require('aws-sdk');

@injectable()
export class EventEmitter {

    private _iotData: AWS.IotData;

    public constructor(
	    @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData
    ) {
        this._iotData = iotDataFactory();
    }

    public async fire(event:EventInfo): Promise<void> {
        logger.debug(`eventEmitter.service fire: in: event:${JSON.stringify(event)}`);

        event.time = new Date().toISOString();

        const topicEnvName = `EVENTS_${event.type.toUpperCase()}_TOPIC`;
        const topicTemplate = process.env[topicEnvName];

        if (topicTemplate===undefined || topicTemplate.length===0) {
            return;
        }

        const topic = topicTemplate.replace('{objectId}', encodeURIComponent(event.objectId)).replace('{event}', event.event);

        const params = {
            topic,
            payload: JSON.stringify(event),
            qos: 1
        };

        logger.debug(`eventEmitter.service publishing: ${JSON.stringify(params)}`);
        await this._iotData.publish(params).promise();
        logger.debug('eventEmitter.service exit:');
    }
}

export interface EventInfo {
    objectId: string;
    type: Type;
    event: Event;
    payload?: string;
    attributes?: {[key: string]: string};
    time?: string;
}

export enum Type {
    group = 'groups',
    groupTemplate = 'groupTemplates',
    device = 'devices',
    deviceTemplate = 'deviceTemplates',
    policy = 'policies',
    profile = 'profiles'
}

export enum Event {
    create='create',
    modify='modify',
    delete='delete'
}
