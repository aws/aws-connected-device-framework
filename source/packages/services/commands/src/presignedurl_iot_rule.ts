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
import {
    PresignedResponseModel,
    PresignedUploadRequestModel,
} from './presignedurls/presignedurls.models';
import { PresignedUrlsService } from './presignedurls/presignedurls.service';
import { logger } from './utils/logger';

let presignedUrlService: PresignedUrlsService;
let commandService: CommandsService;

exports.presignedurl_rule_handler = async (
    event: Event,
    _context: unknown
): Promise<PresignedResponseModel> => {
    logger.debug(`presignedurl_rule_handler: event: ${JSON.stringify(event)}`);

    if (presignedUrlService === undefined) {
        presignedUrlService = container.get(TYPES.PresignedUrlsService);
    }

    if (commandService === undefined) {
        commandService = container.get(TYPES.CommandsService);
    }

    const command = await commandService.get(event.commandId);

    const request: PresignedUploadRequestModel = {
        thingName: event.thingName,
        commandId: command.commandId,
        requestedObjectKeys: event.requestedObjectKeys,
    };

    const r = await presignedUrlService.generateForUpload(request);

    logger.debug(`presignedurl_rule_handler: exit: ${JSON.stringify(r)}`);
    return r;
};

interface Event {
    commandId: string;
    thingName: string;
    requestedObjectKeys: string[];
}
