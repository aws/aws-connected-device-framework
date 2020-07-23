import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { GreengrassSubscription } from './subscriptions.model';

export interface SubscriptionsService {

    addSubscriptions(groupName: string, subscriptions: GreengrassSubscription[], additionalHeaders?:RequestHeaders) : Promise<void>;

    deleteSubscription(groupName:string, id:string, additionalHeaders?:RequestHeaders) : Promise<void>;

    deleteSubscriptions(groupName:string, ids: string[], additionalHeaders?:RequestHeaders) : Promise<void>;

}

@injectable()
export class SubscriptionsServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected subscriptionsRelativeUrl(groupName:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'subscriptions');
    }

    protected subscriptionRelativeUrl(groupName:string, id:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'subscriptions', id);
    }
}
