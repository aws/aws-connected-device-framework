/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import ow from 'ow';
import { CertificatesService } from './certificates/certificates.service';
import { CertificateChunkRequest } from './certificates/certificates.models';

let service:CertificatesService;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  ow(event.Records, ow.array.nonEmpty);
  ow(event.Records[0].EventSource, ow.string.equals('aws:sns'));

  if (service===undefined) {
    service = container.get(TYPES.CertificatesService);
  }

  const chunkRequest:CertificateChunkRequest = JSON.parse(event.Records[0].Sns.Message);
  logger.debug(`chunkRequest: ${JSON.stringify(chunkRequest)}`);
  await service.createChunk(chunkRequest);

  logger.debug('handler: exit:');
};
