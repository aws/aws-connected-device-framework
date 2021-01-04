/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import { ReplayService } from './replay.service';
import { TYPES } from './di/types';
import { container } from './di/inversify.config';
import {Context} from 'aws-lambda';

const replayService: ReplayService = container.get<ReplayService>(TYPES.ReplayService);

exports.handler = async (event: unknown, context:Context) => {

  logger.debug(`event: ${JSON.stringify(event)}`);
  logger.debug(`context: ${JSON.stringify(context)}`);

  try {
    await replayService.fetchFromQueueAndReplay(context);
  } catch (error) {
    logger.error(`error replaying requests: ${error}`);
  }
};
