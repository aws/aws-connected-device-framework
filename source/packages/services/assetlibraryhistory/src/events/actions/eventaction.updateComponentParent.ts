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
import { EventModel, EventType, StateHistoryModel } from '../events.models';
import { EventAction } from './eventaction.interfaces';

@injectable()
export class UpdateComponentParentAction implements EventAction {
    constructor(@inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event: EventModel): Promise<EventModel> {
        logger.debug(`eventaction.updateComponentParent execute: event:${JSON.stringify(event)}}`);

        // TODO: validation
        const parentDeviceId = event.attributes['parentDeviceId'];
        const componentId = event.attributes['componentId'];

        // retrieve the existing stored history of the parent device
        const existingEvent = await this.eventsDao.getLatest(parentDeviceId);

        let existingState = {};
        if (existingEvent !== undefined) {
            // we have a latest
            existingState = JSON.parse(existingEvent.state);
        }

        // augment with the change
        switch (event.event) {
            case EventType.create:
                existingState['components'].push(componentId);
                break;
            case EventType.delete:
                delete existingState['components'][componentId];
                break;
            default:
                logger.debug(
                    `eventaction.updateComponentParent execute: unsupported event:${event.event}`
                );
                return null;
        }

        // save the versions
        const toSave: StateHistoryModel = {
            objectId: parentDeviceId,
            type: event.type,
            time: event.time,
            event: EventType.modify,
            user: event.user,
            state: JSON.stringify(existingState),
        };

        await this.eventsDao.create(toSave);
        toSave.time = 'latest';
        await this.eventsDao.update(toSave);

        return event;
    }
}
