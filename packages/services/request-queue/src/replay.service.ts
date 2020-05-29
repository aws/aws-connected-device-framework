/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import config from 'config';
import AWS = require('aws-sdk');
import { QueuedApiEvent, ApiGatewayEvent, LambdaContext, ApiGatewayInvokeResponsePayload } from './api_gateway_event';
import * as request from 'superagent';
import { TYPES } from './di/types';
import { injectable, inject } from 'inversify';

enum ReplayResult {
	SUCCESS = 'SUCCESS',
  FAIL_RETRYABLE = 'FAIL_RETRYABLE',
  FAIL_NOT_RETRYABLE = 'FAIL_NOT_RETRYABLE'
}

@injectable()
export class ReplayService {

  private _sqs: AWS.SQS;
  private _lambda: AWS.Lambda;

  public constructor(
      @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS,
      @inject(TYPES.LambdaFactory) lambdaFactory: (region: string) => AWS.Lambda,
      @inject('primary.apiLambdaArn') private primaryApiLambdaArn: string,
      @inject('sqs.requestQueue.queueUrl') private sqsRequestQueue: string,
      @inject('sqs.dlqQueue.queueUrl') private sqsDlqQueue: string,
      @inject('sqs.requestQueue.replayBatchSize') private replayBatchSize: number,
      @inject('lambda.stopLambdaAtRemainingMillis') private stopLambdaAtRemainingMillis: number
  ) {
      const primaryRegion: string = primaryApiLambdaArn.split(':')[3];
      this._sqs = sqsFactory();
      this._lambda = lambdaFactory(primaryRegion);
  }

  // in general:
  //   do API call
  //     if success: delete message from queue
  //     if fail: delete message from queue and add to DLQ
  public async fetchFromQueueAndReplay(context: any): Promise<void> {

    let healthy = await this.healthCheck();
    if (!healthy) {
      throw new Error(`primary region is unhealthy`);
    }
    let messages = await this.fetchMessages(this.sqsRequestQueue, this.replayBatchSize);

    while (messages.length > 0 && context.getRemainingTimeInMillis() > this.stopLambdaAtRemainingMillis) {
      for (const msg of messages) {
        const queuedApiEvent:QueuedApiEvent = JSON.parse(msg.Body);
        logger.debug(`processing api event: ${JSON.stringify(queuedApiEvent)}`);
        // do API call
        const result = await this.replayEvent(queuedApiEvent);
        switch (result) {
          case ReplayResult.SUCCESS:
            logger.debug(`success`);
            // remove from queue
            await this.deleteMessage(this.sqsRequestQueue, msg.ReceiptHandle);
            break;
          case ReplayResult.FAIL_NOT_RETRYABLE:
            logger.debug(`replay failed, adding to DLQ`);
            await this.queueEvent(this.sqsDlqQueue, queuedApiEvent);
            await this.deleteMessage(this.sqsRequestQueue, msg.ReceiptHandle);
            break;
          case ReplayResult.FAIL_RETRYABLE:
            logger.debug(`replay failed but retryable`);
            // retryable - leave message in queue
            // NOTE: since this is a FIFO queue, this essentially blocks the queue for the visibility timeout
            break;
          default:
            logger.error(`invalid event`);
        }
      }

      healthy = await this.healthCheck();
      if (!healthy) {
        return;
      }

      messages = await this.fetchMessages(this.sqsRequestQueue, this.replayBatchSize);
    }
    logger.debug(`stopping loop - messsages: ${messages.length} time remaining: ${context.getRemainingTimeInMillis()}`);
  }

  private async fetchMessages(queueUrl: string, maxMessages: number): Promise<AWS.SQS.Message[]> {
      logger.debug(`fetchEvents: queueUrl: ${queueUrl}, maxMessages: ${maxMessages}`);

      const sqsRequest: AWS.SQS.ReceiveMessageRequest = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 5
      };
      const response = await this._sqs.receiveMessage(sqsRequest).promise();

      if (response.hasOwnProperty('Messages')) {
        logger.debug(`fetched ${response.Messages.length} from the queue`);
        return response.Messages;
      } else {
        logger.debug(`queue was empty`);
        return [];
      }
  }

  private async replayEvent(queuedEvent: QueuedApiEvent): Promise<ReplayResult> {
    logger.debug(`replayEvent: queuedEvent: ${JSON.stringify(queuedEvent)}`);

    const apiEvent: ApiGatewayEvent = queuedEvent.event;
    const apiEventContext: LambdaContext = queuedEvent.context;

    logger.debug(`API CALL: ${apiEvent.httpMethod} : ${apiEvent.path}`);
    logger.debug(`Invoke Lambda: ${apiEventContext.invokedFunctionArn}`);

    const invokeRequest: AWS.Lambda.InvocationRequest = {
      FunctionName: this.primaryApiLambdaArn,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(apiEvent)
    };

    const invokeResponse: AWS.Lambda.InvocationResponse = await this._lambda.invoke(invokeRequest).promise();

    logger.debug(`invokeResponse: ${JSON.stringify(invokeResponse)}`);

    const payload: ApiGatewayInvokeResponsePayload = JSON.parse(invokeResponse.Payload.toString());
    logger.debug(`payload: ${JSON.stringify(payload)}`);

    if (payload.statusCode >= 200 && payload.statusCode < 300) {
      return ReplayResult.SUCCESS;
    } else {
      return ReplayResult.FAIL_NOT_RETRYABLE;
    }
  }

  private async deleteMessage(queueUrl: string, handle: string): Promise<void> {
    logger.debug(`deleteMessage: queueUrl: ${queueUrl}, handle: ${handle}`);

    const sqsRequest: AWS.SQS.DeleteMessageRequest = {
      QueueUrl: queueUrl,
      ReceiptHandle: handle
    };

    const response = await this._sqs.deleteMessage(sqsRequest).promise();
    logger.debug(`deleteMessage response: ${JSON.stringify(response)}`);
  }

  private async queueEvent(queueUrl: string, event: any): Promise<void> {
    logger.debug(`queueEvent: queueUrl: ${queueUrl}, event: ${JSON.stringify(event)}`);

    const sqsRequest: AWS.SQS.SendMessageRequest = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageGroupId: 'cdf-request-queue'
    };

    await this._sqs.sendMessage(sqsRequest).promise();
  }

  private async healthCheck() : Promise<boolean>  {
    const healthCheckUrl: string = config.get('primary.healthCheckUrl') as string;

    logger.debug(`healthCheck: checking url: ${healthCheckUrl}`);

    try {
      const res = await request.get(healthCheckUrl).timeout({response: 10000, deadline: 15000});
      logger.debug(`healthCheckStatus: ${res.statusType}`);
      if (res.statusType === 2) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      logger.error(`healthCheck error: ${err}`);
      return false;
    }
  }
}
