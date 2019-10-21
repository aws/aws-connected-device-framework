/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { TYPES } from '../di/types';
import AWS = require('aws-sdk');
import config from 'config';

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

        const topicTemplate = config.get(`events.${event.type}.topic`) as string;

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
