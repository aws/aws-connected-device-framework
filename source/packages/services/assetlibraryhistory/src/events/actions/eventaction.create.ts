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
import { TYPES } from '../../di/types';
import { EventsDao } from '../events.dao';
import { EventModel, StateHistoryModel } from '../events.models';
import { EventAction } from './eventaction.interfaces';

@injectable()
export class CreateAction implements EventAction {
    constructor(@inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event: EventModel): Promise<EventModel> {
        logger.debug(`eventaction.create execute: event:${JSON.stringify(event)}}`);

        // TODO: validation

        const toSave: StateHistoryModel = {
            objectId: event.objectId,
            type: event.type,
            time: event.time,
            event: event.event,
            user: event.user,
            state: event.payload,
        };

        // save the updated job info (1 record for the version, 1 to represent the latest)
        await this.eventsDao.create(toSave);
        const toSave2: StateHistoryModel = {
            ...toSave,
            time: 'latest',
        };
        await this.eventsDao.create(toSave2);

        logger.debug('eventaction.create execute: exit:true');
        return event;
    }
}
