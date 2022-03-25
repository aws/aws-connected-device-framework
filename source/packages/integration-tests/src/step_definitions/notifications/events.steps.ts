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

import { setDefaultTimeout, Given, When, TableDefinition, Then} from 'cucumber';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS, validateExpectedAttributes} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import { EventsourcesService, EventsService, NOTIFICATIONS_CLIENT_TYPES } from '@cdf/notifications-client/dist';
import { EventResource } from '@cdf/notifications-client/dist/client/events.model';
import { createEvent, EVENTSOURCE_NAME, EVENT_DETAILS, EVENT_NAME, getAdditionalHeaders, getEventIdFromName, getEventSourceIdFromName, updateEvent } from './notifications.utils';

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

Given('I am using event {string}', async function (name:string) {
    // logger.debug(`I am using event '${name}'`);
    this[EVENT_NAME]=name;

});

Given('event {string} does not exist', async function (eventName:string) {
    // logger.debug(`event '${eventName}' does not exist:`);
    const eventSourceName = this[EVENTSOURCE_NAME];
    expect(eventSourceName, 'event source name').to.not.be.undefined;
    const eventId = await getEventIdFromName(eventsourcesService, eventsService, this, eventSourceName, eventName);
    // logger.debug(`\t eventId:${eventId}`);
    if (eventId===undefined) {
        return;
    }
    try {
        await eventsService.getEvent(eventId, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        expect(err.status).to.eq(404);
    }
});

Given('event {string} exists', async function (eventName:string) {
    // logger.debug(`event '${eventName}' exists`);
    const eventId = await getEventIdFromName(eventsourcesService, eventsService, this, this[EVENTSOURCE_NAME], eventName);
    // logger.debug(`\t eventId:${eventId}`);
    const event = await eventsService.getEvent(eventId, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
    // logger.debug(`\t event:${JSON.stringify(event)}`);
    expect(event?.eventId).to.eq(eventId);
});

When('I create an event with attributes', async function (data:TableDefinition) {
    // logger.debug(`I create an event with attributes:`);
    this[RESPONSE_STATUS]=null;
    try {
        const eventSourceId = await getEventSourceIdFromName(eventsourcesService, this, this[EVENTSOURCE_NAME]);
        // logger.debug(`\t eventSourceId:${eventSourceId}`);
        const eventId = await createEvent(eventsService, this, eventSourceId, data);
        const event = await eventsService.getEvent(eventId);
        this[EVENT_NAME] = event.name;
        this[`EVENTID___${event.name}`]= eventId;
        // logger.debug(`\t eventId: ${eventId}`);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update event with attributes', async function (data:TableDefinition) {
    // logger.debug(`I update event with attributes:`);
    const id = await getEventIdFromName(eventsourcesService, eventsService, this, this[EVENTSOURCE_NAME], this[EVENT_NAME]);
    // logger.debug(`\t id: ${id}`);
    expect(id, 'eventId').to.not.be.undefined;
    this[RESPONSE_STATUS]=null;
    try {
        await updateEvent(eventsService, this, id, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete event', async function () {
    // logger.debug(`I delete event:`);
    delete this[RESPONSE_STATUS];
    const eventSourceName = this[EVENTSOURCE_NAME];
    const eventName = this[EVENT_NAME];
    expect(eventSourceName, 'event source name').to.not.be.undefined;
    expect(eventName, 'event name').to.not.be.undefined;
    const id = await getEventIdFromName(eventsourcesService, eventsService, this, eventSourceName, eventName);
    // logger.debug(`\t id: ${id}`);
    expect(id, 'eventId').to.not.be.undefined;

    await eventsService.deleteEvent(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
});

Then('last event exists with attributes', async function (data:TableDefinition) {
    // logger.debug(`last event exists with attributes:`);
    delete this[RESPONSE_STATUS];
    delete this[EVENT_DETAILS];
    const id = await getEventIdFromName(eventsourcesService, eventsService, this, this[EVENTSOURCE_NAME], this[EVENT_NAME]);
    // logger.debug(`\t id: ${id}`);
    expect(id, 'eventId').to.not.be.undefined;

    let r:EventResource;
    try {
        r = await eventsService.getEvent(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));

        // logger.debug(`\t r: ${JSON.stringify(r)}`);

        expect(r, 'event').to.not.be.undefined;
        expect(r.eventId, 'eventId').equals(id);
        this[EVENT_DETAILS]=r;
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
    validateExpectedAttributes(r, data);
});
