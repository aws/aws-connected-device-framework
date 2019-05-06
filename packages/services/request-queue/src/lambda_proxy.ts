/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import config from 'config';
import AWS = require('aws-sdk');
import { QueuedApiEvent } from './api_gateway_event';

const sqs = new AWS.SQS();
const sqsRequestQueue = config.get('sqs.requestQueue.queueUrl') as string;

const CDF_V1_TYPE = config.get('cdf.mimeType') as string;
const corsAllowedOrigin = config.get('cors.origin') as string;

const allowedMethods = config.get('cdf.allowedMethods') as string[];

const headers: {[key: string]: string} = {
  'Content-Type': CDF_V1_TYPE
};

exports.handler = async (event: any, context: any, callback: any) => {

  logger.debug(`event: ${JSON.stringify(event)}`);
  logger.debug(`context: ${JSON.stringify(context)}`);

  if (corsAllowedOrigin !== null && corsAllowedOrigin !== '') {
    headers['Access-Control-Allow-Origin'] = corsAllowedOrigin;
  }

  const method = event.httpMethod;

  if (allowedMethods.includes(method)) {
    // write event to SQS
    const apiEventToQueue: QueuedApiEvent = {
      event,
      context
    };

    try {
      await queueEvent(sqsRequestQueue, apiEventToQueue);
      const response = {
        statusCode: 202,
        headers
      };
      callback(null, response);
    } catch (err) {
      const response = {
        statusCode: 500,
        headers,
        body: JSON.stringify({error: 'error adding request to queue'})
      };
      callback(null, response);
    }
  } else {
    // GETs do not make sense in failover region
    const response = {
      statusCode: 503,
      headers,
      body: JSON.stringify({error: `${method} service currently unavailable`})
    };
    callback(null, response);
  }
};

async function queueEvent(queueUrl: string, event: any): Promise<void> {
  logger.debug(`queueEvent: queueUrl: ${queueUrl}, event: ${JSON.stringify(event)}`);

  const sqsRequest: AWS.SQS.SendMessageRequest = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(event),
    MessageGroupId: 'cdf-request-queue'
  };

  await sqs.sendMessage(sqsRequest).promise();
}
