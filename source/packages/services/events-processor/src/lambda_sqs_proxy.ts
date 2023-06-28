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

import { SubscriptionService } from './api/subscriptions/subscription.service';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

let subscriptionService: SubscriptionService;

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: any) => {
    logger.debug(`lambda_sqs_proxy handler: event: ${JSON.stringify(event)}`);

    // lazy init
    if (subscriptionService === undefined) {
        subscriptionService = container.get(TYPES.SubscriptionService);
    }

    if (event.Records) {
        for (const r of event.Records) {
            if (r.eventSource === 'aws:sqs') {
                const messageType = r.messageAttributes?.messageType?.stringValue;
                const body = JSON.parse(r.body);

                if (messageType === 'DeleteSubscription') {
                    try {
                        await subscriptionService.delete(body['subscriptionId']);
                    } catch (err) {
                        if (err.message === 'NOT_FOUND') {
                            // swallow, treat as a success if not found
                        } else {
                            // return the batch to sqs for retrys. if too many retries, sqs moves to dlq
                            throw err;
                        }
                    }
                } else {
                    logger.warn(`lambda_sqs_proxy handler: ignoring un-recognized sqs event`);
                }
            } else {
                logger.warn(
                    `lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(r)}`
                );
                continue;
            }
        }
    }

    logger.debug(`lambda_sqs_proxy handler: exit:`);
};
