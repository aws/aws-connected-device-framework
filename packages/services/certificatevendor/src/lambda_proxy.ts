/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { CertificateService } from './certificates/certificates.service';
import { Action } from './certificates/certificates.models';
import ow from 'ow';

let service:CertificateService;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  ow(event.deviceId, ow.string.nonEmpty);
  ow(event.action, ow.string.nonEmpty);

  if (service===undefined) {
    service = container.get(TYPES.CertificateService);
  }

  if (event.action===Action.get) {
    await service.get(event.deviceId);
  } else if (event.action===Action.ack) {
    await service.ack(event.deviceId);
  } else {
    logger.error(`Unrecognized action: ${event.action}`);
  }

  logger.debug('handler: exit:');

};
