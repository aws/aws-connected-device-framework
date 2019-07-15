/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import { handleError } from './utils/errors';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { CertificateService } from './certificates/certificates.service';
import { Action, CertificateRequestModel } from './certificates/certificates.models';
import ow from 'ow';

let service:CertificateService;

exports.handler = async (event: CertificateRequestModel, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  try {
    ow(event.deviceId, ow.string.nonEmpty);
    ow(event.action, ow.string.nonEmpty);
    ow(event.certId, ow.string.nonEmpty);

    if (service===undefined) {
      service = container.get(TYPES.CertificateService);
    }

    if (event.action===Action.get) {
      if (event.csr !== undefined) {
        ow(event.csr, ow.string.nonEmpty);
        await service.getWithCsr(event.deviceId, event.csr);
      } else {
        await service.get(event.deviceId);
      }
    } else if (event.action===Action.ack) {
      await service.ack(event.deviceId, event.certId);
    } else {
      logger.error(`Unrecognized action: ${event.action}`);
    }
  } catch (e) {
    handleError(e);
  }

  logger.debug('handler: exit:');
};
