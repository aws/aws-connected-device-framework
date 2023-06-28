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
import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { EventSourceDao } from '../api/eventsources/eventsource.dao';
import { CommonEvent } from './transformers.model';

@injectable()
export class DDBStreamTransformer {
    constructor(@inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao) {}

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public async transform(event: any): Promise<CommonEvent[]> {
        logger.debug(`ddbstream.transformer transform: in: event:${JSON.stringify(event)}`);

        const principalAttributes: { [key: string]: string } = {};

        const transformedEvents: CommonEvent[] = [];

        for (const rec of event.Records) {
            // arn:aws:dynamodb:us-west-2:account-id:table/ExampleTableWithStream/stream/2015-06-27T00:48:05.899
            // becomes arn:aws:dynamodb:us-west-2:account-id:table/ExampleTableWithStream
            const arnSplit = rec.eventSourceARN.split('/');
            const eventSourceId = `${arnSplit[0]}/${arnSplit[1]}`;

            /**
             *   validate the event stream
             */
            if (rec.eventSource !== 'aws:dynamodb') {
                logger.error(
                    `eventSource ${eventSourceId} incorrectly configured as a dynamodb stream!`
                );
                break;
            }

            /**
             *   only interested in certain event types
             */
            if (
                rec.eventName !== 'INSERT' &&
                rec.eventName !== 'MODIFY' &&
                rec.eventName !== 'REMOVE'
            ) {
                continue;
            }

            /**
             *   identify the principal of the incoming event source
             */

            let principalAttribute = principalAttributes[eventSourceId];
            if (principalAttribute === undefined) {
                const r = await this.eventSourceDao.get(eventSourceId);
                if (r === undefined) {
                    logger.warn(`eventSource ${eventSourceId} not configured therefore ignoring`);
                    continue;
                }
                principalAttributes[eventSourceId] = r.principal;
                principalAttribute = principalAttributes[eventSourceId];
            }

            if (rec.dynamodb === undefined || rec.dynamodb.Keys === undefined) {
                logger.warn(
                    `eventSource ${eventSourceId} missing 'Keys' therefore ignoring: ${rec}`
                );
                continue;
            }

            /**
             *   transform the incoming event
             */

            const transformedEvent: CommonEvent = {
                eventSourceId,
                principal: principalAttribute,
                principalValue: undefined,
                sourceChangeType: <string>rec.eventName,
                attributes: {},
            };

            const keys = rec.dynamodb.Keys;
            const newImage = rec.dynamodb.NewImage;
            const oldImage = rec.dynamodb.OldImage;

            Object.keys(keys).forEach((prop) => {
                const value = this.extractValue(keys[prop]);
                if (prop === principalAttribute) {
                    transformedEvent.principalValue = <string>value;
                }
                transformedEvent.attributes[prop] = value;
            });

            if (newImage !== undefined) {
                Object.keys(newImage).forEach((prop) => {
                    const value = this.extractValue(newImage[prop]);
                    if (prop === principalAttribute) {
                        transformedEvent.principalValue = <string>value;
                    }
                    transformedEvent.attributes[prop] = value;
                });
            } else if (oldImage !== undefined) {
                // This is considered for REMOVE events only
                Object.keys(oldImage).forEach((prop) => {
                    const value = this.extractValue(oldImage[prop]);
                    if (prop === principalAttribute) {
                        transformedEvent.principalValue = <string>value;
                    }
                    transformedEvent.attributes[prop] = value;
                });
            }

            if (transformedEvent.principalValue === undefined) {
                logger.warn(
                    `eventSource ${eventSourceId} missing value for principal therefore ignoring.  attributes: ${transformedEvent.attributes}`
                );
                continue;
            }

            transformedEvents.push(transformedEvent);
        }

        logger.debug(
            `ddbstream.transformer transform: exit: ${JSON.stringify(transformedEvents)}`
        );
        return transformedEvents;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractValue(json: any): string | boolean | number | string[] | number[] {
        if (json.S !== undefined) {
            return json.S;
        } else if (json.N !== undefined) {
            return parseFloat(json.N);
        } else if (json.BOOL !== undefined) {
            return json.BOOL === 'true';
        } else if (json.SS !== undefined) {
            return <string[]>json.SS;
        } else if (json.NS !== undefined) {
            return <number[]>json.NS;
        } else {
            // not supported
            return undefined;
        }
    }
}
