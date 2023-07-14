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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../di/types';
import { MessagesDao } from '../messages/messages.dao';
import { ResponsesDao } from './responses.dao';
import { Response } from './responses.models';

@injectable()
export class ResponsesService {
    constructor(
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(TYPES.ResponsesDao) private repliesDao: ResponsesDao
    ) {}

    public async save(reply: Response): Promise<void> {
        logger.debug(`responses.service: save: in: reply: ${JSON.stringify(reply)}`);

        ow(reply, ow.object.nonEmpty);
        ow(reply.correlationId, ow.string.nonEmpty);
        ow(reply.thingName, ow.string.nonEmpty);

        const message = await this.messagesDao.getMessageByCorrelation(
            reply.correlationId,
            reply.thingName
        );
        if (message === undefined) {
            throw new Error('MESSAGE_NOT_FOUND');
        }

        await this.repliesDao.save(message.id, reply);

        logger.debug(`responses.service: save: exit:`);
    }
}
