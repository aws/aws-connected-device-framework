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
import { expect, use } from 'chai';
import chaiUuid = require('chai-uuid');
use(chaiUuid);

import { setDefaultTimeout, When, TableDefinition} from 'cucumber';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import { NOTIFICATIONS_CLIENT_TYPES, SubscriptionsService, TargetsService } from '@cdf/notifications-client/dist';
import { SUBSCRIPTION_ID, createTarget, deleteTarget, getAdditionalHeaders } from './notifications.utils';
import { TargetResource } from '@cdf/notifications-client/dist/client/targets.model';

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions
// tslint:disable:no-unused-expression

setDefaultTimeout(10 * 1000);

const subscriptionsService:SubscriptionsService = container.get(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService);
const targetsService:TargetsService = container.get(NOTIFICATIONS_CLIENT_TYPES.TargetsService);

When('I add {string} target with attributes', async function (targetType:string, data:TableDefinition) {
    this[RESPONSE_STATUS]=null;
    try {
        await createTarget(targetsService, this, this[SUBSCRIPTION_ID], targetType, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I remove {string} target with endpoint {string}', async function (targetType:string, endpoint:string) {
    this[RESPONSE_STATUS]=null;
    try {
        await deleteTarget(targetsService, this, this[SUBSCRIPTION_ID], targetType, endpoint);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I remove {string} target with {string} {string}', async function (targetType:string, key:string, value:string) {
    // logger.debug(`I remove '${targetType}' target with '${key}' '${value}'`);
    this[RESPONSE_STATUS]=null;
    try {
        const subscription = await subscriptionsService.getSubscription(this[SUBSCRIPTION_ID], getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        // logger.debug(`\t subscription: ${JSON.stringify(subscription)}`);
        expect(subscription, 'subscription').to.not.be.undefined;
        const target = subscription?.targets?.[targetType]?.filter( (t:TargetResource) => t[key]===value)?.[0];
        // logger.debug(`\t target: ${JSON.stringify(target)}`);
        expect(target, 'target').to.not.be.undefined;
        let endpoint:string;
        switch (targetType) {
            case 'email':
                endpoint='address';
                break;
            case 'sms':
                endpoint='phoneNumber';
                break;
            case 'push_gcm':
            case 'push_apns':
            case 'push_ads':
                endpoint = 'platformEndpointArn';
                break;
            case 'dynamodb':
                endpoint = 'tableName';
                break;
            default:
                throw new Error('unknown target type');
        }

        // logger.debug(`\t endpoint: ${endpoint}, value: ${target[endpoint]}`);
        await deleteTarget(targetsService, this, this[SUBSCRIPTION_ID], targetType, target[endpoint]);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});
