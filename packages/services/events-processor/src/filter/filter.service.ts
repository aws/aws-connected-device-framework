
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger';
import ow from 'ow';
import { CommonEvent } from '../transformers/transformers.model';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { FilterDao } from './filter.dao';

@injectable()
export class FilterService {

    constructor(
        @inject(TYPES.FilterDao) private filterDao: FilterDao) {

        }

    public async filter(events:CommonEvent[]): Promise<void> {
        logger.debug(`filter.service filter: in: model:${JSON.stringify(events)}`);

        // cache for the duration of the method
        const subscriptionMap: { [key:string]:SubscriptionItem[]} = {};

        for(const ev of events) {

            // perform lookup to see if any subscriptions are configured for the event source/principal
            const mapKey = `${ev.eventSourceId}-${ev.principal}`;
            let subscriptions = subscriptionMap[mapKey];
            if (subscriptions===undefined) {
                subscriptions = await this.filterDao.listSubscriptions(ev.eventSourceId, ev.principal);
                if (subscriptions===undefined || subscriptions.length===0) {
                    continue;
                }
                subscriptionMap[mapKey]=subscriptions;
            }

            // TODO: if configured, execute the ruleset

            // TODO: if rules pass, save the alert
        }
 
        logger.debug(`filter.service filter: exit:`);

    }

}
