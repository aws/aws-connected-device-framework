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

import { container } from './di/inversify.config';

import { CommandsService } from './commands/commands.service';
import { TYPES } from './di/types';
import { MessagesService } from './messages/messages.service';
import { logger } from './utils/logger.util';

const messagesService: MessagesService = container.get(TYPES.MessagesService);
const commandsService: CommandsService = container.get(TYPES.CommandsService);

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: unknown) => {
  logger.debug(`lambda_sqs_handler handler: event: ${JSON.stringify(event)}`);

  if (event?.Records) {
    for (const r of event.Records) {

      if (r.eventSource !== 'aws:sqs') {
        logger.warn(`lambda_sqs_handler handler: ignoring non-sqs events: ${JSON.stringify(r)}`);
        continue;
      }

      const messageType = r.messageAttributes?.messageType?.stringValue;
      const body = JSON.parse(r.body);


      if (messageType==='Message::Delete') {
        await messagesService.processMessageDeletion(body.messageId);
      } else if (messageType==='Message::Recipient::Delete') {
        await messagesService.processRecipientDeletion(body.messageId, body.thingName);
      } else if (messageType.startsWith('Message::')) {
        await messagesService.processMessage(body.message, body.command);
      } else if (messageType==='Command::Delete') {
        await commandsService.processCommandDeletion(body.commandId);
      } else {
        logger.warn(`lambda_sqs_handler handler: ignoring un-recognized sqs event`);
      }
    }
  }

  logger.debug(`lambda_sqs_handler handler: exit:`);

};