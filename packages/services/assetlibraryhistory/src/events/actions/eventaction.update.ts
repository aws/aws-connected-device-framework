/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';
import { injectable, inject } from 'inversify';
import { EventAction } from './eventaction.interfaces';
import { EventsDao } from '../events.dao';
import { EventModel, StateHistoryModel } from '../events.models';

@injectable()
export class UpdateAction implements EventAction {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event:EventModel): Promise<EventModel> {
        logger.debug(`eventaction.update execute: event:${JSON.stringify(event)}}`);

        // TODO: validation

        // retrieve the existing stored history
        const existingEvent = await this.eventsDao.getLatest(event.objectId);

        let existingState= {};
        if (existingEvent!==undefined) {
            // we have a latest
            existingState = JSON.parse(existingEvent.state);
        }

        // augment with the change
        const changedState = JSON.parse(event.payload);
        const mergedState = Object.assign(existingState, changedState);

        if (event.attributes!==undefined) {
            if (event.attributes['attachedToGroup']!==undefined) {
                mergedState['groups'].push(event.attributes['attachedToGroup']);
            } else if (event.attributes['detachedFromGroup']!==undefined) {
                delete mergedState['groups'][event.attributes['attachedToGroup']];
            } else if (event.attributes['attachedToDevice']!==undefined) {
                mergedState['devices'].push(event.attributes['attachedToDevice']);
            } else if (event.attributes['detachedFromDevice']!==undefined) {
                delete mergedState['devices'][event.attributes['attachedToDevice']];
            }
        }

        // update the incoming event so actions may be chained
        event.payload = JSON.stringify(mergedState);

        // finally, save the versions
        const toSave:StateHistoryModel = {
            objectId: event.objectId,
            type: event.type,
            time: event.time,
            event: event.event,
            user: event.user,
            state: event.payload
        };

        await this.eventsDao.create(toSave);
        toSave.time = 'latest';
        await this.eventsDao.update(toSave);

        return event;

    }

}
