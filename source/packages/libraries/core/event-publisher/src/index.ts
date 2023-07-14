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
import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { logger } from '@awssolutions/simple-cdf-logger';
import { EVENT_PUBLISHER_TYPES } from './di/types';

import ow from 'ow';

export { EVENT_PUBLISHER_TYPES } from './di/types';
export { eventPublisherContainerModule } from './di/inversify.config';

export interface CDFEvent<T> {
    name: string;
    payload: T;
    // Allow user to include trace header if we want end to end trace in xray
    traceHeader?: string;
}

export interface CDFEventPublisher {
    emitEvent<T>(event: CDFEvent<T>): Promise<void>;
    emitEvents<T>(events: CDFEvent<T>[]): Promise<void>;
}

@injectable()
export class NoOpEventPublisher implements CDFEventPublisher {
    emitEvent<T>(_event: CDFEvent<T>): Promise<void> {
        return Promise.resolve();
    }
    emitEvents<T>(_events: CDFEvent<T>[]): Promise<void> {
        return Promise.resolve();
    }
}

@injectable()
export class EventBridgePublisher implements CDFEventPublisher {
    private eventBridge: EventBridgeClient;
    private readonly eventBridgeBusName: string;
    private readonly cdfServiceName: string;

    constructor(
        @inject(EVENT_PUBLISHER_TYPES.EventBridgeFactory)
        eventBridgeFactory: (region?: string) => EventBridgeClient,
    ) {
        this.eventBridge = eventBridgeFactory();

        ow(process.env.AWS_EVENTBRIDGE_BUS_NAME, ow.string.nonEmpty);
        ow(process.env.CDF_SERVICE_EVENTBRIDGE_SOURCE, ow.string.nonEmpty);

        this.eventBridgeBusName = process.env.AWS_EVENTBRIDGE_BUS_NAME;
        this.cdfServiceName = process.env.CDF_SERVICE_EVENTBRIDGE_SOURCE;
    }

    public async emitEvent<T>(event: CDFEvent<T>): Promise<void> {
        logger.debug(`cdfEventPublisher: emitEvent: in: event:${JSON.stringify(event)}`);
        await this.emitEvents([event]);
        logger.debug(`cdfEventPublisher: emitEvent: exit:`);
    }

    private assembleEventBridgeRequest<T>(events: CDFEvent<T>[]): PutEventsRequestEntry[] {
        logger.debug(`cdfEventPublisher: emitEvents: in: events:${JSON.stringify(events)}`);
        const assembledEvents = events.map(
            ({ payload, name, traceHeader }): PutEventsRequestEntry => {
                return {
                    EventBusName: this.eventBridgeBusName,
                    Source: this.cdfServiceName,
                    Detail: JSON.stringify(payload),
                    DetailType: name,
                    TraceHeader: traceHeader,
                };
            },
        );

        logger.debug(
            `cdfEventPublisher: emitEvents: exit: assembledEvents:${JSON.stringify(
                assembledEvents,
            )}`,
        );
        return assembledEvents;
    }

    public async emitEvents<T>(events: CDFEvent<T>[]): Promise<void> {
        logger.debug(`cdfEventPublisher: emitEvents: in: events:${JSON.stringify(events)}`);

        const assembledEvents = this.assembleEventBridgeRequest(events);

        await this.eventBridge.send(
            new PutEventsCommand({
                Entries: assembledEvents,
            }),
        );

        logger.debug(`cdfEventPublisher: emitEvents: exit:`);
    }
}
