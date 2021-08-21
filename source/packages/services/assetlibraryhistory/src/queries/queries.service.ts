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
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { EventsDao, ListCategoryEventsArgs, ListObjectEventsArgs, SortDirection } from '../events/events.dao';
import { StateHistoryListModel } from '../events/events.models';

@injectable()
export class QueryService {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao:EventsDao) {}

    public async listCategoryEvents(args:ListCategoryEventsArgs) : Promise<StateHistoryListModel> {
        logger.debug(`query.service listCategoryEvents: in: args:${JSON.stringify(args)}`);

        // TODO validation
        args.category = args.category.toLowerCase();
        if (args.timeFrom===undefined) {
            args.timeFrom='1970-';
        }
        if (args.timeTo===undefined) {
            args.timeTo = '9999-';
        }

        if (args.sort===undefined) {
            args.sort=SortDirection.desc;
        }

        const events = await this.eventsDao.listCategoryEvents(args);

        logger.debug(`query.service listCategoryEvents: exit: events:${JSON.stringify(events)}`);
        return events;

    }

    public async listObjectEvents(args:ListObjectEventsArgs) : Promise<StateHistoryListModel> {
        logger.debug(`query.service listObjectEvents: in: args:${JSON.stringify(args)}`);

        // TODO validation
        args.category = args.category.toLowerCase();
        args.objectId = args.objectId.toLocaleLowerCase();
        if (args.timeFrom===undefined) {
            args.timeFrom='1970-';
        }
        if (args.timeTo===undefined) {
            args.timeTo = '9999-';
        }

        if (args.sort===undefined) {
            args.sort=SortDirection.desc;
        }

        const events = await this.eventsDao.listObjectEvents(args);

        logger.debug(`query.service listObjectEvents: exit: events:${JSON.stringify(events)}`);
        return events;

    }

}
