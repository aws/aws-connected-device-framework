/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { CommandsService } from './commands/commands.service';
import { DeleteThingGroupRequest } from 'aws-sdk/clients/iot';

let commandService:CommandsService;
let iot:AWS.Iot;

exports.job_lifecycle_rule_handler = async (event: any, _context: any) => {
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

  const response = {
    commandId: command.commandId,
    jobId: event.jobId,
    deleted
  };

  logger.debug(`job_lifecycle_rule_handler: exit: ${JSON.stringify(response)}`);
  return response;

};
