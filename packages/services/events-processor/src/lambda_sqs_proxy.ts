/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger.util';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import {SubscriptionService} from './api/subscriptions/subscription.service';
import config from 'config';

// log detected config
logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

let subscriptionService:SubscriptionService;

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: any) => {
  logger.debug(`lambda_sqs_proxy handler: event: ${JSON.stringify(event)}`);

  // lazy init
  if (subscriptionService===undefined) {
    subscriptionService = container.get(TYPES.SubscriptionService);
  }

  if (event.Records) {
    for (const r of event.Records) {

      if (r.eventSource === 'aws:sqs') {
        const messageType = r.messageAttributes?.messageType?.stringValue;
        const body = JSON.parse(r.body);

        if (messageType==='DeleteSubscription') {
          try {
            await subscriptionService.delete(body['subscriptionId']);
          } catch (err) {
            if (err.message==='NOT_FOUND') {
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
        logger.warn(`lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(r)}`);
        continue;
      }
    }
  }

  logger.debug(`lambda_sqs_proxy handler: exit:`);

};