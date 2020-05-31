import {SubscriptionResource, SubscriptionResourceList} from './subscriptions.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';
import {CommonServiceBase} from './common.service';

export interface SubscriptionsService {
    createSubscription(eventId: string, subscription: SubscriptionResource, additionalHeaders?: RequestHeaders): Promise<void>;

    getSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResource>;

    deleteSubscription(subscriptionId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    listSubscriptionsForUser(userId: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList>;

    listSubscriptionsForEvent(eventId: string, fromSubscriptionId?: string, additionalHeaders?: RequestHeaders): Promise<SubscriptionResourceList>;
}

@injectable()
export class SubscriptionsServiceBase extends CommonServiceBase  {

    protected eventSubscriptionsRelativeUrl(eventId: string): string {
        return `/events/${eventId}/subscriptions`;
    }

    protected subscriptionRelativeUrl(subscriptionId: string): string {
        return `/subscriptions/${subscriptionId}`;
    }

    protected userSubscriptionsRelativeUrl(userId: string): string {
        return `/users/${userId}/subscriptions`;
    }
}
