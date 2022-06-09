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

import { EventsourcesService, EventsService, NOTIFICATIONS_CLIENT_TYPES, SubscriptionsService } from '@cdf/notifications-client/dist';
import { getEventIdFromName, getAdditionalHeaders, getEventSourceIdFromName } from '../step_definitions/notifications/notifications.utils';

import { Before, setDefaultTimeout} from '@cucumber/cucumber';
import { container } from '../di/inversify.config';
import { EventSourceType } from '@cdf/notifications-client/dist/client/eventsources.model';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';

setDefaultTimeout(30 * 1000);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const eventsourceService:EventsourcesService = container.get(NOTIFICATIONS_CLIENT_TYPES.EventSourcesService);
const eventService:EventsService = container.get(NOTIFICATIONS_CLIENT_TYPES.EventsService);
const subscriptionsService:SubscriptionsService = container.get(NOTIFICATIONS_CLIENT_TYPES.SubscriptionsService);

async function teardown_all(world:unknown, eventSourceName:string, eventName?:string) {
    const eventSourceId = await getEventSourceIdFromName(eventsourceService, world,eventSourceName);
    if (eventSourceId) {
        if (eventName) {
            const eventId = await getEventIdFromName(eventsourceService, eventService, world, eventSourceName, eventName);
            if (eventId) {
                try {
                    const subscriptions = await subscriptionsService.listSubscriptionsForEvent(eventId, undefined, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
                    if (subscriptions?.results?.length>0) {
                        for(const s of subscriptions.results) {
                            await subscriptionsService.deleteSubscription(s.id, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
                        }
                    }
                } catch (e) {
                    // ignore
                }
                await eventService.deleteEvent(eventId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
            }
        }
        await eventsourceService.deleteEventSource(eventSourceId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
    }
}

async function teardown_event_sources(world:unknown) {
    /// teardown
    await teardown_all(world,'TEST-iotcore');
}

Before({tags: '@setup_event_sources'}, async function () {
    await teardown_event_sources(this);
});

Before({tags: '@teardown_event_sources'}, async function () {
    await teardown_event_sources(this);
});

async function teardown_iotCoreEventSourceFeature(world:unknown) {
    await teardown_all(world, 'TEST-IoTCore', 'TEST-IoTCore-event');
}

Before({tags: '@setup_iotCoreEventSourceFeature'}, async function () {
    await teardown_iotCoreEventSourceFeature(this);
});

Before({tags: '@teardown_iotCoreEventSourceFeature'}, async function () {
    await teardown_iotCoreEventSourceFeature(this);
});

async function teardown_events(world:unknown) {
    /// teardown
    const eventSourceId = await getEventSourceIdFromName(eventsourceService, world,'TEST-events');
    if (eventSourceId) {
        const eventId = await getEventIdFromName(eventsourceService, eventService, world, eventSourceId, 'TEST-events-event');
        if (eventId) {
            await eventService.deleteEvent(eventId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]))
        }
        await eventsourceService.deleteEventSource(eventSourceId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
    }
}

Before({tags: '@setup_events'}, async function () {
    await teardown_events(this);

    // create the `TEST-events` event source
    await eventsourceService.createEventSource({
        sourceType: EventSourceType.IoTCore,
        name: 'TEST-events',
        principal: 'thingName',
        iotCore: {
            mqttTopic: 'test/events',
            attributes: {
                batteryLevel: 'bl'
            }
        }
    }, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
});

Before({tags: '@teardown_events'}, async function () {
    await teardown_events(this);
});

async function teardown_subscriptions(world:unknown) {
    /// teardown
    const eventSourceId = await getEventSourceIdFromName(eventsourceService, world,'TEST-subscriptions');
    if (eventSourceId) {
        const eventId = await getEventIdFromName(eventsourceService, eventService, world, 'TEST-subscriptions', 'TEST-subscriptions-event');
        if (eventId) {
            const subscriptions = await subscriptionsService.listSubscriptionsForEvent(eventId, undefined, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
            if (subscriptions?.results?.length>0) {
                for(const s of subscriptions.results) {
                    await subscriptionsService.deleteSubscription(s.id, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
                }
            }
            await eventService.deleteEvent(eventId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]))
        }
        await eventsourceService.deleteEventSource(eventSourceId, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
    }
}

Before({tags: '@setup_subscriptions'}, async function () {
    await teardown_subscriptions(this);

    // create the `TEST-subscriptions` event source
    const eventSourceId = await eventsourceService.createEventSource({
        sourceType: EventSourceType.IoTCore,
        name: 'TEST-subscriptions',
        principal: 'thingName',
        iotCore: {
            mqttTopic: 'test/subscriptions',
            attributes: {
                batteryLevel: 'bl'
            }
        }
    }, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));

    // create the `TEST-subscriptions-event` event
    await eventService.createEvent(eventSourceId, {
        name: 'TEST-subscriptions-event',
        conditions: {
            all: [{
                fact: 'batteryLevel',
                operator: 'lessThanInclusive',
                value: 20
            }]
        },
        supportedTargets: {
            email: 'default',
            sms: 'small'
        },
        templates: {
            default: 'The battery for bowl {{=it.principalValue}} is low.',
            small: '{{=it.principalValue}} battery low'
        }
    }, getAdditionalHeaders(this[AUTHORIZATION_TOKEN]));
});

Before({tags: '@teardown_subscriptions'}, async function () {
    await teardown_subscriptions(this);
});
