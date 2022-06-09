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
import { injectable, inject } from 'inversify';
import ow from 'ow';
import { CommonEvent } from '../transformers/transformers.model';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';
import { Rule, Engine, TopLevelCondition, EngineResult } from 'json-rules-engine';
import { AlertDao } from '../alerts/alert.dao';
import { AlertItem } from '../alerts/alert.models';
import { EventConditionsUtils, TemplatePropertiesData } from '../api/events/event.models';
import { EventDao } from '../api/events/event.dao';
import { TemplateCache } from '../api/messages/messageTemplates.model';

@injectable()
export class FilterService {

    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.AlertDao) private alertDao: AlertDao,
        @inject(TYPES.EventConditionsUtils) private eventConditionsUtils: EventConditionsUtils,
        @inject(TYPES.EventDao) private eventDao: EventDao) {
    }

    public async filter(events: CommonEvent[]): Promise<void> {
        logger.debug(`filter.service filter: in: model:${JSON.stringify(events)}`);

        ow(events, ow.array.nonEmpty);

        // for performance, cache for the duration of the method call...
        const subscriptionMap: { [key: string]: SubscriptionItem[] } = {};
        const ruleMap: { [key: string]: Rule } = {};

        const engine = new Engine();

        const alerts: AlertItem[] = [];
        const changedSubAlerts: { [key: string]: SubscriptionItem } = {};

        for (const ev of events) {

            // perform lookup to see if any subscriptions are configured for the event source/principal/principalValue (cached for the duration of the method call)
            const subscriptions = (await this.listSubscriptionsForEvent(ev, subscriptionMap)).filter(o => o.enabled);

            // if we have subscriptions, lets evaluate them against the datasource
            if (subscriptions !== undefined) {

                for (const sub of subscriptions) {

                    // initializing an empty cache
                    const templateCache: TemplateCache = {};

                    // initialize the rule (cached for the duration of the method call)
                    let rule = ruleMap[sub.event.id];
                    if (rule === undefined) {
                        rule = new Rule({
                            conditions: sub.event.conditions as TopLevelCondition,
                            event: {
                                type: sub.event.name
                            }
                        });
                        ruleMap[sub.event.id] = rule;
                    }

                    engine.addRule(rule);

                    // add all root elements with '__' prefix, except attributes
                    Object.keys(ev)
                        .filter(key => key !== 'attributes')
                        .forEach(key => engine.addFact('__' + key, ev[key]));

                    // add all the known facts
                    Object.keys(ev.attributes)
                        .filter(key => ev.attributes[key] !== undefined && ev.attributes[key] !== null)
                        .forEach(key => engine.addFact(key, ev.attributes[key]));

                    // evaluate the rules
                    let results: EngineResult;
                    try {
                        results = await engine.run();
                    } catch (err) {
                        // silently ignore, as an incoming message may not contain the facts we're interested in
                    }
                    logger.debug(`filter.service filter: results:${JSON.stringify(results)}`);

                    if (results?.events?.length > 0) {
                        if (!sub.alerted || sub.event.disableAlertThreshold) {
                            // a new alert...
                            const attributes = await this.getTemplatePropertiesData(sub, ev, templateCache);
                            alerts.push(this.buildAlert(sub, attributes));
                            if (!sub.alerted) {
                                changedSubAlerts[sub.id] = {
                                    id: sub.id,
                                    eventSource: {
                                        id: sub.eventSource.id,
                                        principal: sub.eventSource.principal
                                    },
                                    principalValue: sub.principalValue,
                                    alerted: true
                                };
                            }
                            sub.alerted = true;
                        }
                    } else if (results?.events?.length === 0 && sub.alerted) {
                        // an alert that needs resetting...
                        sub.alerted = false;
                        changedSubAlerts[sub.id] = {
                            id: sub.id,
                            eventSource: {
                                id: sub.eventSource.id,
                                principal: sub.eventSource.principal
                            },
                            principalValue: sub.principalValue,
                            alerted: false
                        };
                    }

                    // clear the engine state ready for the next run
                    Object.keys(ev.attributes).forEach(key => engine.removeFact(key));
                    engine.removeRule(rule);
                }

                // save the subscription in case its state changed
                const mapKey = this.subscriptionMapKey(ev);
                subscriptionMap[mapKey] = subscriptions;
            }
        }

        logger.debug(`filter.service filter: alerts:${JSON.stringify(alerts)}`);
        if (alerts.length > 0) {
            await this.alertDao.create(alerts);
        }
        if (Object.keys(changedSubAlerts).length > 0) {
            await this.alertDao.updateChangedSubAlertStatus(changedSubAlerts);
        }

        logger.debug(`filter.service filter: exit:`);

    }

    private buildAlert(sub: SubscriptionItem, templatePropertiesData: TemplatePropertiesData): AlertItem {
        logger.debug(`filter.service buildAlert: in: sub:${JSON.stringify(sub)}`);
        const alert: AlertItem = {
            version: 2.0,
            time: new Date().toISOString(),
            subscription: {
                id: sub.id,
                principalValue: sub.principalValue
            },
            event: {
                id: sub.event.id,
                name: sub.event.name
            },
            eventSource: {
                principal: sub.eventSource.principal
            },
            user: {
                id: sub.user.id
            },
            targets: sub.targets,
            sns: sub.sns,
            templatePropertiesData
        };
        logger.debug(`filter.service buildAlert: exit: ${JSON.stringify(alert)}`);
        return alert;
    }

    private subscriptionMapKey(ev: CommonEvent): string {
        return `${ev.eventSourceId}:${ev.principal}:${ev.principalValue}`;
    }

    private async listSubscriptionsForEvent(ev: CommonEvent, subscriptionMap: { [key: string]: SubscriptionItem[] }) {
        logger.debug(`filter.service listSubscriptionsForEvent: in: ev:${JSON.stringify(ev)}, subscriptionMap:${JSON.stringify(subscriptionMap)}`);

        const mapKey = this.subscriptionMapKey(ev);
        let subscriptions = subscriptionMap[mapKey];
        if (subscriptions === undefined) {
            subscriptions = await this.subscriptionDao.listSubscriptionsForEventMessage(ev.eventSourceId, ev.principal, ev.principalValue);
            if (subscriptions !== undefined && subscriptions.length > 0) {
                for (const sub of subscriptions) {
                    this.eventConditionsUtils.populateParameters(sub.event.conditions, sub.ruleParameterValues);
                }
                subscriptionMap[mapKey] = subscriptions;
            }
        }

        logger.debug(`filter.service listSubscriptionsForEvent: exit: subscriptions:${JSON.stringify(subscriptions)}`);
        return subscriptions;
    }

    private async getTemplatePropertiesData(sub: SubscriptionItem, event: CommonEvent, templateCache: TemplateCache): Promise<TemplatePropertiesData> {
        logger.debug(`filter.service getEventAttributes: in: ev:${JSON.stringify(sub)}, subscriptionMap:${JSON.stringify(event)}`);
        const templatePropertiesData = {};

        // check if there are any attributes and actually has an event to lookup
        if (!sub.id) {
            return templatePropertiesData;
        }
        const event_id = sub.event.id;

        // check if the template exists in cache
        if (!templateCache[event_id]) {
            // cache the template
            templateCache[event_id] = await this.eventDao.getEventConfig(event_id);
        }
        // get template from cache
        const eventConfig = templateCache[event_id];

        // get all the template properties referenced in the templates
        const templateProperties = eventConfig.templateProperties;

        if (templateProperties) {
            templateProperties.forEach(k => {
                templatePropertiesData[k] = event.attributes[k];
            });
            templatePropertiesData['principalValue'] = event.principalValue
        }

        logger.debug(`filter.service getEventAttributes: exit: attributeMap:${JSON.stringify(templatePropertiesData)}`);
        // Return an object of referenced template properties and their values
        return templatePropertiesData;
    }
}
