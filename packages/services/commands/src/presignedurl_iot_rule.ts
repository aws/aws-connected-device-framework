/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { PresignedUrlsService } from './presignedurls/presignedurls.service';
import { TYPES } from './di/types';
import { PresignedUploadRequestModel } from './presignedurls/presignedurls.models';
import { CommandsService } from './commands/commands.service';

let presignedUrlService:PresignedUrlsService;
let commandService:CommandsService;

exports.presignedurl_rule_handler = async (event: any, _context: any) => {
  logger.debug(`presignedurl_rule_handler: event: ${JSON.stringify(event)}`);

  if (presignedUrlService===undefined) {
    presignedUrlService = container.get(TYPES.PresignedUrlsService);
  }

  if (commandService===undefined) {
    commandService = container.get(TYPES.CommandsService);
  }

  const command = await commandService.get(event.commandId);

  const request:PresignedUploadRequestModel = {
    thingName: event.thingName,
    commandId: command.commandId,
	  requestedObjectKeys: event.requestedObjectKeys
  };

  const r = await presignedUrlService.generateForUpload(request);

  logger.debug(`presignedurl_rule_handler: exit: ${JSON.stringify(r)}`);
  return r;

};
