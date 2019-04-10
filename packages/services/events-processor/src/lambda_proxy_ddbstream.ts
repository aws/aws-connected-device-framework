/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { DDBStreamTransformer } from './transformers/ddbstream.transformer';

let transformer:DDBStreamTransformer;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  // transform the message
  if (transformer===undefined) {
    transformer = container.get(TYPES.DDBStreamTransformer);
  }
  const commonMessage = await transformer.transform(event);

  if (commonMessage!=undefined && commonMessage.length>0) {
    // TODO: process the message
  }


};
