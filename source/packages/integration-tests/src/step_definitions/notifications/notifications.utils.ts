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

import { Dictionary } from '@awssolutions/cdf-lambda-invoke';
import {
    EventsourcesService,
    EventsService,
    SubscriptionsService,
    TargetsService,
} from '@awssolutions/cdf-notifications-client/dist';
import { EventResource } from '@awssolutions/cdf-notifications-client/dist/client/events.model';
import { EventSourceDetailResource } from '@awssolutions/cdf-notifications-client/dist/client/eventsources.model';
import {
    SubscriptionResource,
    SubscriptionV2Resource,
} from '@awssolutions/cdf-notifications-client/dist/client/subscriptions.model';
import { DataTable } from '@cucumber/cucumber';
import { AUTHORIZATION_TOKEN, buildModel } from '../common/common.steps';
import { TargetResource } from '@awssolutions/cdf-notifications-client/dist/client/targets.model';

export const EVENTSOURCE_ID = 'eventSourceId';
export const EVENTSOURCE_DETAILS = 'eventSourceDetails';
export const EVENTSOURCE_NAME = 'eventSourceName';
export const EVENT_DETAILS = 'eventDetails';
export const EVENT_NAME = 'eventName';
export const EVENT_ID = 'eventId';
export const SUBSCRIPTION_ID = 'subscriptionId';
export const SUBSCRIPTION_DETAILS = 'subscriptionDetails';
export const PRINCIPAL_VALUE = 'principalValue';
export const USER_ID = 'userId';
export const TARGET_ID = 'targetId';

export function getAdditionalHeaders(authToken?: string): Dictionary {
    return {
        Authorization: authToken,
    };
}

export async function getEventSourceIdFromName(
    eventsourcesService: EventsourcesService,
    world: unknown,
    name: string
): Promise<string> {
    // logger.debug(`getEventSourceIdFromName: name:${name}`);
    let eventSourceId = world[`EVENTSOURCEID___${name}`];
    if (eventSourceId === undefined) {
        const existingEventSource = await eventsourcesService.listEventSources(
            getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
        );
        eventSourceId = existingEventSource?.results?.filter((r) => r.name === name)?.[0]?.id;
        world[`EVENTSOURCEID___${name}`] = eventSourceId;
    }
    // logger.debug(`getEventSourceIdFromName: eventSourceId:${eventSourceId}`);
    return eventSourceId;
}

export async function getEventIdFromName(
    eventsourcesService: EventsourcesService,
    eventsService: EventsService,
    world: unknown,
    eventSourceName: string,
    eventName: string
): Promise<string> {
    // logger.debug(`getEventIdFromName: eventSourceName:${eventSourceName}, eventName:${eventName}`);
    let eventId = world[`EVENTID___${eventName}`];
    if (eventId === undefined) {
        const eventSourceId = await getEventSourceIdFromName(
            eventsourcesService,
            world,
            eventSourceName
        );
        if (eventSourceId !== undefined) {
            const existingEvents = await eventsService.listEventsForEventSource(
                eventSourceId,
                undefined,
                undefined,
                getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
            );
            eventId = existingEvents?.results?.filter((r) => r.name === eventName)?.[0]?.eventId;
            world[`EVENTID___${eventName}`] = eventId;
        }
    }
    // logger.debug(`getEventIdFromName: eventId:${eventId}`);
    return eventId;
}

export async function getSubscriptionIdFromPrincipal(
    eventsourcesService: EventsourcesService,
    eventsService: EventsService,
    service: SubscriptionsService,
    world: unknown,
    userId: string,
    eventSourceName: string,
    eventName: string,
    principalValue: string
): Promise<string> {
    // logger.debug(`getSubscriptionIdFromPrincipal: userId:${userId}, eventSourceName:${eventSourceName}, eventName:${eventName}, principalValue:${principalValue}`);
    let subscriptionId;
    const eventId = await getEventIdFromName(
        eventsourcesService,
        eventsService,
        world,
        eventSourceName,
        eventName
    );
    // logger.debug(`\t eventId:${eventId}`);
    if (eventId) {
        const key = `SUBSCRIPTIONID___${userId}___${eventName}___${principalValue}`;
        subscriptionId = world[key];
        // logger.debug(`\t existing subscriptionId:${subscriptionId}`);
        if (subscriptionId === undefined) {
            const existing = await service.listSubscriptionsForUser(
                userId,
                getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
            );
            // logger.debug(`\t existing:${JSON.stringify(existing)}`);
            const results: SubscriptionV2Resource[] =
                existing?.results as SubscriptionV2Resource[];
            subscriptionId = results?.filter(
                (r) =>
                    r.user.id === userId &&
                    r.event.id === eventId &&
                    r.principalValue === principalValue
            )?.[0]?.id;
            world[key] = subscriptionId;
            // logger.debug(`\t subscriptionId:${subscriptionId}`);
        }
    } else {
        throw new Error('eventId is undefined in getSubscriptionIdFromPrincipal');
    }
    return subscriptionId;
}

export async function createEventSource(
    eventsourcesService: EventsourcesService,
    world: unknown,
    data: DataTable
): Promise<string> {
    const model: EventSourceDetailResource = buildModel(data);
    return await eventsourcesService.createEventSource(
        model,
        getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
    );
}

export async function createEvent(
    eventsService: EventsService,
    world: unknown,
    eventSourceId: string,
    data: DataTable
): Promise<string> {
    const model: EventResource = buildModel(data);
    return await eventsService.createEvent(
        eventSourceId,
        model,
        getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
    );
}

export async function updateEvent(
    eventsService: EventsService,
    world: unknown,
    eventId: string,
    data: DataTable
): Promise<void> {
    const model: EventResource = buildModel(data);
    model.eventId = eventId;
    // logger.debug(`model: ${JSON.stringify(model)}`);
    await eventsService.updateEvent(model, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
}

export async function createSubscription(
    service: SubscriptionsService,
    world: unknown,
    eventId: string,
    data: DataTable
): Promise<string> {
    const model: SubscriptionResource = buildModel(data);
    return await service.createSubscription(
        eventId,
        model,
        getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
    );
}

export async function createTarget(
    service: TargetsService,
    world: unknown,
    subscriptionId: string,
    targetType: string,
    data: DataTable
): Promise<void> {
    const model: TargetResource = buildModel(data);
    await service.createTarget(
        subscriptionId,
        targetType,
        model,
        getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
    );
}

export async function deleteTarget(
    service: TargetsService,
    world: unknown,
    subscriptionId: string,
    targetType: string,
    endpoint: string
): Promise<void> {
    await service.deleteTarget(
        subscriptionId,
        targetType,
        endpoint,
        getAdditionalHeaders(world[AUTHORIZATION_TOKEN])
    );
}

export async function updateSubscription(
    service: SubscriptionsService,
    world: unknown,
    data: DataTable
): Promise<void> {
    const model: SubscriptionResource = buildModel(data);
    model.id = world[SUBSCRIPTION_ID];
    await service.updateSubscription(model, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
}
