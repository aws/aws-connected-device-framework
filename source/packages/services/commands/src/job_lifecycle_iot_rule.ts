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
import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { CommandsService } from './commands/commands.service';
import { DeleteThingGroupRequest } from 'aws-sdk/clients/iot';

let commandService:CommandsService;
let iot:AWS.Iot;

exports.job_lifecycle_rule_handler = async (event: Event, _context: unknown) : Promise<HandlerResponse> => {
  logger.debug(`job_lifecycle_rule_handler: event: ${JSON.stringify(event)}`);

  if (commandService===undefined) {
    commandService = container.get(TYPES.CommandsService);
  }

  if (iot===undefined) {
    const iotFactory: () => AWS.Iot = container.get(TYPES.IotFactory);
    iot = iotFactory();
  }

  // only interested in final states
  if (event.jobEvent!=='completed' && event.jobEvent!=='canceled' && event.jobEvent!=='deleted') {
    const r = {message: `Filtering out event type: ${event.jobEvent}`};
    logger.debug(`job_lifecycle_rule_handler: exit: ${JSON.stringify(r)}`);
    return r;
  }

  // retrieve the job related to the command
  const command = await commandService.getByJobId(event.jobId);

  if (command===undefined) {
    const r = {message: `Job with id ${event.jobId} not found`};
    logger.debug(`job_lifecycle_rule_handler: exit: ${JSON.stringify(removeEventListener)}`);
    return r;
  }

  // does it have an ephemeral group as its target?
  const deleted:string[]=[];
  for(const target of command.targets) {
    if (target.startsWith('arn:aws:iot:')) {
      const elements = target.split(':');
      if (elements[5]===`thinggroup/ephemeral-${command.commandId}`) {
         // delete the ephemeral group
        const params:DeleteThingGroupRequest = {
          thingGroupName: target
        };
        await iot.deleteThingGroup(params).promise();
        deleted.push(target);
      }
    }
  }

  const response:HandlerResponse = {
    commandId: command.commandId,
    jobId: event.jobId,
    deleted
  };

  logger.debug(`job_lifecycle_rule_handler: exit: ${JSON.stringify(response)}`);
  return response;

}

interface HandlerResponse {
  commandId?: string,
  jobId?: string,
  deleted?: string[],
  message?:string
}

interface Event {
  jobId:string,
  jobEvent:string
}
