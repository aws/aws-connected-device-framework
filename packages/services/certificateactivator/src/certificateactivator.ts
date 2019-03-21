/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { ActivationService } from './activation/activation.service';
import { RegistrationEvent } from './activation/activation.models';
import ow from 'ow';

let service:ActivationService;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  try {
    ow(event.certificateId, ow.string.nonEmpty);
    ow(event.caCertificateId, ow.string.nonEmpty);
    ow(event.timestamp, ow.number.integer);
    ow(event.awsAccountId, ow.string.nonEmpty);
    ow(event.certificateRegistrationTimestamp, ow.string.nonEmpty);
  } catch (e) {
    // validation errors shoudn't be retried by Lambda, so
    // log an error and then return something instead of passing the error up
    logger.error(`Validation error ${JSON.stringify(e)} on event: ${JSON.stringify(event)}`);
    return {'status':'error','message':'VALIDATION_ERROR'};
  }

  let registrationMessage:RegistrationEvent;
  try {
    registrationMessage = JSON.parse(JSON.stringify(event));
    logger.debug(`registrationMessage: ${JSON.stringify(registrationMessage)}`);
  } catch(e) {
    // parsing errors shoudn't be retried by Lambda, so
    // log an error and then return something instead of passing the error up
    logger.error(`Error ${JSON.stringify(e)} parsing event: ${JSON.stringify(event)}`);
    return {'status':'error','message':'PARSING_ERROR'};
  }

  if (service===undefined) {
    service = container.get(TYPES.ActivationService);
  }

  await service.activate(registrationMessage);

  logger.debug('handler: exit:');
  return {'status':'success'};
};
