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
import { expect } from 'chai';
import { setDefaultTimeout, Given, When, TableDefinition, Then} from 'cucumber';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS, validateExpectedAttributes} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import { EventsourcesService, NOTIFICATIONS_CLIENT_TYPES } from '@cdf/notifications-client/dist';
import { EventSourceDetailResource } from '@cdf/notifications-client/dist/client/eventsources.model';
import { createEventSource, getAdditionalHeaders, EVENTSOURCE_NAME, EVENTSOURCE_DETAILS, EVENTSOURCE_ID, getEventSourceIdFromName } from './notifications.utils';

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions
// tslint:disable:no-unused-expression

setDefaultTimeout(10 * 1000);

const eventsourcesService:EventsourcesService = container.get(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService);

Given('I am using eventsource {string}', async function (name:string) {
    // logger.debug(`I am using eventsource '${name}'`);
    this[EVENTSOURCE_NAME]=name;
});

Given('eventsource {string} does not exist', async function (name:string) {
    // logger.debug(`eventsource '${name}' does not exist`);
    const existing = await eventsourcesService.listEventSources(getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
    const matches = existing?.results?.filter(r=> r.name===name).length>0 ?? false;
    expect(matches).to.be.false;
});

Given('eventsource {string} exists', async function (name:string) {
    const existing = await eventsourcesService.listEventSources(getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
    const matches = existing?.results?.filter(r=> r.name===name).length>0 ?? false;
    expect(matches).to.be.true;
});

When('I create an eventsource with attributes', async function (data:TableDefinition) {
    this[EVENTSOURCE_ID]=null;
    this[RESPONSE_STATUS]=null;
    try {
        this[EVENTSOURCE_ID]=await createEventSource(eventsourcesService, this, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete eventsource', async function () {
    // logger.debug(`I delete eventsource:`);
    delete this[RESPONSE_STATUS];
    const eventSourceName = this[EVENTSOURCE_NAME];
    expect(eventSourceName, 'event source name').to.not.be.undefined;
    const id = await getEventSourceIdFromName(eventsourcesService, this, eventSourceName);
    // logger.debug(`\t id: ${id}`);
    expect(id, 'id').to.not.be.undefined;

    await eventsourcesService.deleteEventSource(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
});

Then('last eventsource exists with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;
    this[EVENTSOURCE_DETAILS]=null;
    const id = this[EVENTSOURCE_ID];

    let r:EventSourceDetailResource;
    try {
        r = await eventsourcesService.getEventSource(id, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
        expect(id).equals(r.id);
        this[EVENTSOURCE_DETAILS]=r;
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

    validateExpectedAttributes(r, data);
});
