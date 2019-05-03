/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import { container } from './di/inversify.config';
import { SNSTarget, SNSMessages } from './targets/sns.target';
import { TYPES } from './di/types';
import { MessageCompilerService } from './targets/messageCompiler.service';
import { extractValue } from './utils/dynamoDbUtils';

let sns: SNSTarget;
let messageCompiler: MessageCompilerService;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  // init
  if (sns === undefined) {
    sns = container.get(TYPES.SNSTarget);
  }
  if (messageCompiler === undefined) {
    messageCompiler = container.get(TYPES.MessageCompilerService);
  }

  // review all the incoming records
  for (const rec of event.Records) {

    // not interested in anything other than new images with target info
    if (rec.dynamodb === undefined) {
      continue;
    }
    const img = rec.dynamodb.NewImage;
    if (img === undefined) {
      continue;
    }
    if (img.targets === undefined) {
      continue;
    }
    const targets: { [key: string]: string } = extractValue(img.targets);
    if (Object.keys(targets).length === 0) {
      continue;
    }

    // grab all the attributes so we can use them to compile messages later
    const attributes: { [key: string]: string } = {};
    Object.keys(img)
      .filter(key => key !== 'targets' && key !== 'gsi2Key' && key !== 'gsi2Sort')
      .forEach(key => attributes[key] = extractValue(img[key]));

    const eventId = attributes['eventId'];

    // build the messages for each destination
    const messages = new SNSMessages();
    if (targets['email'] !== undefined) {
      messages.email = await messageCompiler.compile(eventId, 'email', attributes);
    }
    if (targets['sms'] !== undefined) {
      messages.default = await messageCompiler.compile(eventId, 'sms', attributes);
    }
    // TODO: add rest of sns destination types

    if (messages.hasMessage) {
      await sns.send(attributes['snsTopicArn'], attributes['eventName'], messages);
    }

    // TODO: add rest of non-sns destination types

  }

};
