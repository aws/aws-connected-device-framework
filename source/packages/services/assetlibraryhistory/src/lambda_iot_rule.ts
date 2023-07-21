/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import 'reflect-metadata';

import { logger } from '@awssolutions/simple-cdf-logger';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { EventModel } from './events/events.models';
import { EventsService } from './events/events.service';

const eventsService: EventsService = container.get(TYPES.EventsService);

exports.iot_rule_handler = async (event: EventModel, _context: unknown) => {
    logger.debug(`events.service create: in: event: ${JSON.stringify(event)}`);

    // TODO validation

    await eventsService.create(event);

    logger.debug('events.service create: exit:');
};
