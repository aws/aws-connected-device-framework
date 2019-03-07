import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { EventsDao, ListCategoryEventsArgs, ListObjectEventsArgs, SortDirection } from '../events/events.dao';

@injectable()
export class QueryService {

    constructor(
        @inject(TYPES.EventsDao) private eventsDao:EventsDao) {}

    public async listCategoryEvents(args:ListCategoryEventsArgs) {
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

    public async listObjectEvents(args:ListObjectEventsArgs) {
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
