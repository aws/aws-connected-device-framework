/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import 'reflect-metadata';
import { container } from './di/inversify.config';
import { logger } from './utils/logger';
import { EventsService } from './events/events.service';
import { TYPES } from './di/types';
import { EventModel } from './events/events.models';

const eventsService:EventsService = container.get(TYPES.EventsService);

exports.iot_rule_handler = async (event: EventModel, _context: any) => {
  logger.debug(`events.service create: in: event: ${JSON.stringify(event)}`);

  // TODO validation

  await eventsService.create(event);

  logger.debug('events.service create: exit:');
};
