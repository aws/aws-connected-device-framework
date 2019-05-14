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
export class CreateAction implements EventAction {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event:EventModel): Promise<EventModel> {
        logger.debug(`eventaction.create execute: event:${JSON.stringify(event)}}`);

        // TODO: validation

        const toSave:StateHistoryModel = {
            objectId: event.objectId,
            type: event.type,
            time: event.time,
            event: event.event,
            user: event.user,
            state: event.payload
        };

        // save the updated job info (1 record for the version, 1 to represent the latest)
        await this.eventsDao.create(toSave);
        toSave.time = 'latest';
        await this.eventsDao.create(toSave);

        logger.debug('eventaction.create execute: exit:true');
        return event;

    }

}
