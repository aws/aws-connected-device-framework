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

import ow from 'ow';

import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { Response } from './responses/responses.models';
import { ResponsesService } from './responses/responses.service';
import { logger } from './utils/logger.util';

const svc:ResponsesService = container.get<ResponsesService>(TYPES.ResponsesService);

exports.handler = async (event: Response, _context: unknown) : Promise<void> => {
  logger.debug(`lambda_shadow_command_response_handler: handler: in: event: ${JSON.stringify(event)}`);

  // validate reply
  ow(event, ow.object.nonEmpty);
  ow(event.correlationId, ow.string.nonEmpty);
  ow(event.thingName, ow.string.nonEmpty);


  // the response payload is the whole shadow delta. extract just what we're interested in
  const payload = Object.values(event.payload)?.[0];
  const reply:Response = {
    thingName: event.thingName,
    correlationId: event.correlationId,
    payload: payload?.payload,
    action: payload?.action,
    timestamp: payload?.timestamp
  };

  // TODO: configure a lambda destination to handle errors?
  await svc.save(reply);

  logger.debug(`lambda_shadow_command_response_handler: handler: exit:`);

};
