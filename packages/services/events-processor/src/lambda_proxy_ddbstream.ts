/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger.util';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { DDBStreamTransformer } from './transformers/ddbstream.transformer';
import { FilterService } from './filter/filter.service';

let transformer:DDBStreamTransformer;
let filter:FilterService;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`lambda_proxy_ddbstream handler: event: ${JSON.stringify(event)}`);

  // init
  if (transformer===undefined) {
    transformer = container.get(TYPES.DDBStreamTransformer);
  }
  if (filter===undefined) {
    filter = container.get(TYPES.FilterService);
  }

  // transform the message
  const commonEvents = await transformer.transform(event);

  if (commonEvents!==undefined && commonEvents.length>0) {
    // process the message
    await filter.filter(commonEvents);
  }

  logger.debug(`lambda_proxy_ddbstream handler: exit:`);

};
