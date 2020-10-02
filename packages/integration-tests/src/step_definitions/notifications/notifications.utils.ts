import {query} from 'jsonpath';
import { Dictionary } from '@cdf/lambda-invoke';
import { EventsourcesService, EventsService, SubscriptionsService, TargetsService } from '@cdf/notifications-client/dist';
import { EventResource } from '@cdf/notifications-client/dist/client/events.model';
import { EventSourceDetailResource } from '@cdf/notifications-client/dist/client/eventsources.model';
import { SubscriptionResource, SubscriptionV2Resource } from '@cdf/notifications-client/dist/client/subscriptions.model';
import { expect } from 'chai';
import { TableDefinition } from 'cucumber';
import { AUTHORIZATION_TOKEN, replaceTokens } from '../common/common.steps';
import { logger } from '../utils/logger';
import { TargetResource } from '@cdf/notifications-client/dist/client/targets.model';

export const EVENTSOURCE_ID = 'eventSourceId';
export const EVENTSOURCE_DETAILS = 'eventSourceDetails';
export const EVENTSOURCE_NAME = 'eventSourceName';
export const EVENT_DETAILS = 'eventDetails';
export const EVENT_NAME = 'eventName';
export const SUBSCRIPTION_ID = 'subscriptionId';
export const SUBSCRIPTION_DETAILS = 'subscriptionDetails';
export const PRINCIPAL_VALUE = 'principalValue';
export const USER_ID = 'userId';
export const TARGET_ID = 'targetId';

export function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

export async function getEventSourceIdFromName(eventsourcesService:EventsourcesService, world:any, name:string) : Promise<string> {
    logger.debug(`getEventSourceIdFromName: name:${name}`);
    let eventSourceId = world[`EVENTSOURCEID___${name}`];
    if (eventSourceId===undefined) {
        const existingEventSource = await eventsourcesService.listEventSources(getAdditionalHeaders(world));
        eventSourceId = existingEventSource?.results?.filter(r=> r.name===name)?.[0]?.id;
        world[`EVENTSOURCEID___${name}`] = eventSourceId;
    }
    logger.debug(`getEventSourceIdFromName: eventSourceId:${eventSourceId}`);
    return eventSourceId;
}

export async function getEventIdFromName(eventsourcesService:EventsourcesService, eventsService:EventsService, world:any, eventSourceName:string,eventName:string) : Promise<string> {
    logger.debug(`getEventIdFromName: eventSourceName:${eventSourceName}, eventName:${eventName}`);
    let eventId = world[`EVENTID___${eventName}`];
    if (eventId===undefined) {
        const eventSourceId = await getEventSourceIdFromName(eventsourcesService, world, eventSourceName);
        if (eventSourceId!==undefined) {
            const existingEvents = await eventsService.listEventsForEventSource(eventSourceId, undefined,undefined, getAdditionalHeaders(world));
            eventId = existingEvents?.results?.filter(r=> r.name===eventName)?.[0]?.eventId;
            world[`EVENTID___${eventName}`] = eventId;
        }
    }
    logger.debug(`getEventIdFromName: eventId:${eventId}`);
    return eventId;
}

export async function getSubscriptionIdFromPrincipal(eventsourcesService:EventsourcesService, eventsService:EventsService, service:SubscriptionsService, world:any,userId:string,eventSourceName:string,eventName:string,principalValue:string) : Promise<string> {
    logger.debug(`getSubscriptionIdFromPrincipal: userId:${userId}, eventSourceName:${eventSourceName}, eventName:${eventName}, principalValue:${principalValue}`);
    let subscriptionId;
    const eventId = await getEventIdFromName(eventsourcesService, eventsService, world, eventSourceName, eventName);
    logger.debug(`\t eventId:${eventId}`);
    if (eventId) {
        const key = `SUBSCRIPTIONID___${userId}___${eventName}___${principalValue}`;
        subscriptionId = world[key];
        logger.debug(`\t existing subscriptionId:${subscriptionId}`);
        if (subscriptionId===undefined) {
            const existing = await service.listSubscriptionsForUser(userId,getAdditionalHeaders(world));
            logger.debug(`\t existing:${JSON.stringify(existing)}`);
            const results:SubscriptionV2Resource[] = existing?.results as SubscriptionV2Resource[];
            subscriptionId = results?.filter(r=> r.user.id===userId && r.event.id===eventId && r.principalValue===principalValue)?.[0]?.id;
            world[key] = subscriptionId;
            logger.debug(`\t subscriptionId:${subscriptionId}`);
        }
    }
    return subscriptionId;
}

export async function createEventSource (eventsourcesService:EventsourcesService, world:any, data:TableDefinition) {
    const model:EventSourceDetailResource = buildModel(data);
    return await eventsourcesService.createEventSource(model, getAdditionalHeaders(world));
}

export async function createEvent (eventsService:EventsService, world:any, eventSourceId:string, data:TableDefinition) : Promise<string> {
    const model:EventResource = buildModel(data);
    return await eventsService.createEvent(eventSourceId, model, getAdditionalHeaders(world));
}

export async function updateEvent (eventsService:EventsService, world:any, eventId:string, data:TableDefinition) : Promise<void> {
    const model:EventResource = buildModel(data);
    model.eventId = eventId;
    logger.debug(`model: ${JSON.stringify(model)}`);
    await eventsService.updateEvent(model, getAdditionalHeaders(world));
}

export async function createSubscription (service:SubscriptionsService, world:any, eventId:string, data:TableDefinition) : Promise<string> {
    const model:SubscriptionResource = buildModel(data);
    return await service.createSubscription( eventId, model, getAdditionalHeaders(world));
}

export async function createTarget(service:TargetsService, world:any, subscriptionId:string, targetType:string, data:TableDefinition) : Promise<void> {
    const model:TargetResource = buildModel(data);
    await service.createTarget(subscriptionId, targetType, model, getAdditionalHeaders(world));
}

export async function deleteTarget(service:TargetsService, world:any, subscriptionId:string, targetType:string, endpoint:string) : Promise<void> {
    await service.deleteTarget(subscriptionId, targetType, endpoint, getAdditionalHeaders(world));
}

export async function updateSubscription (service:SubscriptionsService, world:any, data:TableDefinition) : Promise<void> {
    const model:SubscriptionResource = buildModel(data);
    model.id = world[SUBSCRIPTION_ID];
    await service.updateSubscription(model, getAdditionalHeaders(world));
}

export function buildModel<T>(data:TableDefinition) : T {
    const d = data.rowsHash();

    const resource = { } as T;

    Object.keys(d).forEach( key => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            resource[key] = JSON.parse(value);
        } else if (value==='___null___') {
            resource[key] = null;
        } else if (value==='___undefined___') {
            delete resource[key];
        } else {
            resource[key] = value;
        }
    });

    return resource;
}

export function validateExpectedAttributes<T>(model:T, data:TableDefinition) {
    const d = data.rowsHash();
    Object.keys(d).forEach( key => {
        const expected = replaceTokens(d[key]);
        const actual = query(model, key);
        if (expected==='___null___') {
            expect(actual?.[0], key).eq(null);
        } else if (expected==='___undefined___') {
            expect(actual?.[0], key).eq(undefined);
        } else if (expected==='___any___') {
            expect(actual?.[0]!==undefined, key).eq(true);
        } else if (expected==='___uuid___') {
            expect(actual?.[0], key).to.be.uuid('v1');
        } else if (expected==='___arn___') {
            expect(actual?.[0], key).to.startWith('arn:aws:');
        } else if (expected==='true' || expected==='false') {
            expect(actual?.[0], key).eq( Boolean(expected));
        } else {
            expect(String(actual?.[0]), key).to.eq( expected);
        }
    });
}