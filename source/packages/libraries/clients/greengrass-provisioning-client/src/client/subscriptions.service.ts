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
