
import { injectable, inject } from 'inversify';
import ow from 'ow';
import { CommonEvent } from '../transformers/transformers.model';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';

@injectable()
export class FilterService {

    constructor(
        @inject(TYPES.SubscriptionDao) private dao: SubscriptionDao) {

        }

    public async filter(events:CommonEvent[]): Promise<void> {
        logger.debug(`filter.service filter: in: model:${JSON.stringify(events)}`);

        ow(events, ow.array.nonEmpty);

        // cache for the duration of the method
        const subscriptionMap: { [key:string]:SubscriptionItem[]} = {};

        for(const ev of events) {

            // perform lookup to see if any subscriptions are configured for the event source/principal
            const mapKey = `${ev.eventSourceId}-${ev.principal}`;
            let subscriptions = subscriptionMap[mapKey];
            if (subscriptions===undefined) {
                subscriptions = await this.dao.listSubscriptionsForEventSource(ev.eventSourceId, ev.principal);
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
