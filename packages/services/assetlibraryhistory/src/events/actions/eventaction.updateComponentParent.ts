/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';
import { injectable, inject } from 'inversify';
import { EventAction } from './eventaction.interfaces';
import { EventsDao } from '../events.dao';
import { EventModel, StateHistoryModel, EventType } from '../events.models';

@injectable()
export class UpdateComponentParentAction implements EventAction {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event:EventModel): Promise<EventModel> {
        logger.debug(`eventaction.updateComponentParent execute: event:${JSON.stringify(event)}}`);

        // TODO: validation
        const parentDeviceId = event.attributes['parentDeviceId'];
        const componentId = event.attributes['componentId'];

        // retrieve the existing stored history of the parent device
        const existingEvent = await this.eventsDao.getLatest(parentDeviceId);

        let existingState= {};
        if (existingEvent!==undefined) {
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
            logger.debug(`eventaction.updateComponentParent execute: unsupported event:${event.event}`);
            return null;
        }

        // save the versions
        const toSave:StateHistoryModel = {
            objectId: parentDeviceId,
            type: event.type,
            time: event.time,
            event: EventType.modify,
            user: event.user,
            state: JSON.stringify(existingState)
        };

        await this.eventsDao.create(toSave);
        toSave.time = 'latest';
        await this.eventsDao.update(toSave);

        return event;

    }

}
