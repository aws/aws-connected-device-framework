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
import { fail } from 'assert';
import chaiUuid = require('chai-uuid');
use(chaiUuid);

import { setDefaultTimeout, When, TableDefinition, Then, Given} from 'cucumber';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS, validateExpectedAttributes} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import { EventsourcesService, EventsService, MessagesDebugService, NOTIFICATIONS_CLIENT_TYPES, SubscriptionsService } from '@cdf/notifications-client/dist';
import { EVENTSOURCE_NAME, SUBSCRIPTION_ID, EVENT_NAME, getEventIdFromName, createSubscription, SUBSCRIPTION_DETAILS, getAdditionalHeaders, getSubscriptionIdFromPrincipal, PRINCIPAL_VALUE, USER_ID, updateSubscription } from './notifications.utils';
import { SubscriptionResource } from '@cdf/notifications-client/dist/client/subscriptions.model';
import { SimulateIoTCoreMessageRequest } from '@cdf/notifications-client/dist/client/messages.model';

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions
// tslint:disable:no-unused-expression

setDefaultTimeout(10 * 1000);

const eventsService:EventsService = container.get(NOTIFICATIONS_CLIENT_TYPES.EventsService);
const eventsourcesService:EventsourcesService = container.get(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService);
const subscriptionsService:SubscriptionsService = container.get(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService);
const messagesService:MessagesDebugService = container.get(NOTIFICATIONS_CLIENT_TYPES.MessageDebugService);

Given('subscription for principal {string} user {string} does not exist', async function(principalValue:string, userId:string) {
    // logger.debug(`subscription for principal '${principalValue}' user '${userId}' does not exist`);
    // logger.debug(`\t EVENTSOURCE_NAME: ${this[EVENTSOURCE_NAME]}`);
    // logger.debug(`\t EVENT_NAME: ${this[EVENT_NAME]}`);
    expect(this[EVENTSOURCE_NAME], 'EVENTSOURCE_NAME').to.not.be.undefined;

    expect(this[EVENT_NAME], 'EVENT_NAME').to.not.be.undefined;
    const subId = await getSubscriptionIdFromPrincipal(eventsourcesService, eventsService, subscriptionsService, this, userId, this[EVENTSOURCE_NAME], this[EVENT_NAME], principalValue);
    // logger.debug(`\t subId: ${subId}`);
    expect(subId).to.be.undefined;
});

Given('I am using subscription for principal {string} user {string}', async function (principalValue:string, userId:string) {
    // logger.debug(`'I am using subscription for principal '${principalValue}' user '${userId}'`);
    // logger.debug(`\t EVENTSOURCE_NAME: ${this[EVENTSOURCE_NAME]}`);
    // logger.debug(`\t EVENT_NAME: ${this[EVENT_NAME]}`);
    expect(this[EVENTSOURCE_NAME], 'EVENTSOURCE_NAME').to.not.be.undefined;
    expect(this[EVENT_NAME], 'EVENT_NAME').to.not.be.undefined;

    expect(principalValue, 'principalValue').to.not.be.undefined;
    expect(userId, 'userId').to.not.be.undefined;

    this[PRINCIPAL_VALUE]=principalValue;
    this[USER_ID]=userId;
    this[SUBSCRIPTION_ID] = await getSubscriptionIdFromPrincipal(eventsourcesService, eventsService, subscriptionsService, this, userId, this[EVENTSOURCE_NAME], this[EVENT_NAME], principalValue);
    // logger.debug(`\t SUBSCRIPTION_ID: ${this[SUBSCRIPTION_ID]}`);
    expect(this[SUBSCRIPTION_ID], 'SUBSCRIPTION_ID').to.not.be.undefined;
});

When('I create a subscription with attributes', async function (data:TableDefinition) {
    this[SUBSCRIPTION_ID]=null;
    this[RESPONSE_STATUS]=null;
    try {
        const eventId = await getEventIdFromName(eventsourcesService, eventsService, this, this[EVENTSOURCE_NAME], this[EVENT_NAME]);
        this[SUBSCRIPTION_ID]= await createSubscription(subscriptionsService, this, eventId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update subscription with attributes', async function (data:TableDefinition) {
    this[SUBSCRIPTION_ID]=null;
    this[RESPONSE_STATUS]=null;
    try {
        await updateSubscription(subscriptionsService, this, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I send the following iotcore message', async function (data:TableDefinition) {
    try {
        const d = data.rowsHash();
        const params:SimulateIoTCoreMessageRequest = {
            topic: d.topic,
            payload: d.payload
        };
        await messagesService.simulateIoTCoreMessage(params);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('last subscription exists with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;
    this[SUBSCRIPTION_DETAILS]=null;
    const id = this[SUBSCRIPTION_ID];

    expect(id).to.not.be.undefined;

    let r:SubscriptionResource;
    try {
        r = await subscriptionsService.getSubscription(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        expect(r, 'subscription').to.not.be.undefined;
        expect(r.id, 'id').equals(id);
        this[SUBSCRIPTION_DETAILS]=r;
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

    validateExpectedAttributes(r, data);

});

Then('last subscription has not been alerted', async function () {
    this[RESPONSE_STATUS]=null;
    const id = this[SUBSCRIPTION_ID];

    expect(id).to.not.be.undefined;

    let r:SubscriptionResource;
    try {
        r = await subscriptionsService.getSubscription(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        expect(r, 'subscription').to.not.be.undefined;
        expect(r.id, 'id').equals(id);
        expect(r.alerted, 'alerted').equals(false);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('last subscription has been alerted', async function () {
    this[RESPONSE_STATUS]=null;
    const id = this[SUBSCRIPTION_ID];

    expect(id).to.not.be.undefined;

    let r:SubscriptionResource;
    try {
        r = await subscriptionsService.getSubscription(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        expect(r, 'subscription').to.not.be.undefined;
        expect(r.id, 'id').equals(id);
        expect(r.alerted, 'alerted').equals(true);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('no subscriptions exist for event {string}', async function (eventName:string) {
    this[RESPONSE_STATUS]=null;

    const eventId = this[`EVENTID___${eventName}`];
    // logger.debug(`\t eventId: ${eventId}`);
    expect(eventId, 'eventId').to.not.be.undefined;

    try {
        await subscriptionsService.listSubscriptionsForEvent(eventId, undefined, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});
