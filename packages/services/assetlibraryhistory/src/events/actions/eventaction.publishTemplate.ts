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
import { EventModel, StateHistoryModel } from '../events.models';

@injectable()
export class PublishTemplateAction implements EventAction {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event:EventModel): Promise<EventModel> {
        logger.debug(`eventaction.publishTemplate execute: event:${JSON.stringify(event)}}`);

        // TODO: validation
        const status = event.attributes['status'];

        // retrieve the existing stored history
        const existingEvent = await this.eventsDao.getLatest(event.objectId);

        let existingState= {};
        if (existingEvent!==undefined) {
            // we haev a latest, therefore augment with the change
            existingState = JSON.parse(existingEvent.state);
        }
        existingState['status'] = status;

        // finally, save the versions
        const toSave:StateHistoryModel = {
            objectId: event.objectId,
            type: event.type,
            time: event.time,
            event: event.event,
            user: event.user,
            state: JSON.stringify(existingState)
        };

        await this.eventsDao.create(toSave);
        toSave.time = 'latest';
        await this.eventsDao.update(toSave);

        return event;

    }

}
