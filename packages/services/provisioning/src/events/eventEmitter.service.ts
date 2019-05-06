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
