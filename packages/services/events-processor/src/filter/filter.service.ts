/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import ow from 'ow';
import { CommonEvent } from '../transformers/transformers.model';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';
import * as rulesEngine from 'json-rules-engine';
import { AlertDao } from '../alerts/alert.dao';
import { AlertItem } from '../alerts/alert.models';
import { EventConditionsUtils } from '../api/events/event.models';

@injectable()
export class FilterService {

    constructor(
        @inject(TYPES.SubscriptionDao) private subscriptionDao: SubscriptionDao,
        @inject(TYPES.AlertDao) private alertDao: AlertDao,
        @inject(TYPES.EventConditionsUtils) private eventConditionsUtils: EventConditionsUtils) {
    }

    public async filter(events:CommonEvent[]): Promise<void> {
        logger.debug(`filter.service filter: in: model:${JSON.stringify(events)}`);

        ow(events, ow.array.nonEmpty);

        // for performance, cache for the duration of the method call...
        const subscriptionMap: { [key:string]:SubscriptionItem[]} = {};
        const ruleMap: { [key:string]:rulesEngine.Rule} = {};

        const engine = new rulesEngine.Engine();

        const alerts:AlertItem[]=[];
        const changedSubAlerts:{[key:string]:SubscriptionItem}= {};

        for(const ev of events) {

            // perform lookup to see if any subscriptions are configured for the event source/principal/principalValue (cached for the duration of the method call)
            const subscriptions = await this.listSubscriptionsForEvent(ev, subscriptionMap);

            // if we have subscriptions, lets evaluate them against the datasource
            if (subscriptions!==undefined) {

                for(const sub of subscriptions) {

                    // initialize the rule (cached for the duration of the method call)
                    let rule = ruleMap[sub.event.id];
                    if (rule===undefined) {
                        rule = new rulesEngine.Rule({
                            conditions: sub.event.conditions,
                            event: {
                                type: sub.event.name
                            }
                        });
                        ruleMap[sub.event.id] = rule;
                    }

                    engine.addRule(rule);

                    // add all root elements with '__' prefix, except attributes
                    Object.keys(ev)
                        .filter(key=> ev[key]!=='attributes')
                        .forEach(key=> engine.addFact( '__' + key, ev[key]));

                    // add all the known facts
                    Object.keys(ev.attributes)
                        .filter(key=> ev.attributes[key]!==undefined && ev.attributes[key]!==null)
                        .forEach(key=> engine.addFact(key, ev.attributes[key]));

                        // evaluate the rules
                    let results:rulesEngine.Rule[] = [];
                    try {
                        results = await engine.run();
                    } catch (err) {
                        // silently ignore, as an incoming message may not contain the facts we're interested in
                    }
                    if (results.length>0 && !sub.alerted) {
                        // a new alert...
                        alerts.push(this.buildAlert(sub));
                        sub.alerted=true;
                        changedSubAlerts[sub.id]= {
                            id: sub.id,
                            eventSource: {
                                id: sub.eventSource.id,
                                principal: sub.eventSource.principal
                            },
                            principalValue: sub.principalValue,
                            alerted: true
                        };
                    } else if (results.length===0 && sub.alerted) {
                        // an alert that needs resetting...
                        sub.alerted=false;
                        changedSubAlerts[sub.id]= {
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
                    Object.keys(ev.attributes).forEach(key=> engine.removeFact(key));
                    engine.removeRule(rule);
                }
            }
        }

        logger.debug(`filter.service filter: alerts:${JSON.stringify(alerts)}`);
        if (alerts.length>0) {
            await this.alertDao.create(alerts);
        }
        if (Object.keys(changedSubAlerts).length>0) {
            await this.alertDao.updateChangedSubAlertStatus(changedSubAlerts);
        }

        logger.debug(`filter.service filter: exit:`);

    }

    private buildAlert(sub:SubscriptionItem):AlertItem {
        logger.debug(`filter.service buildAlert: in: sub:${JSON.stringify(sub)}`);
        const alert:AlertItem = {
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
            sns: sub.sns
        };
        logger.debug(`filter.service buildAlert: exit: ${JSON.stringify(alert)}`);
        return alert;
    }

    private async listSubscriptionsForEvent(ev:CommonEvent, subscriptionMap:{ [key:string]:SubscriptionItem[]} ) {
        logger.debug(`filter.service listSubscriptionsForEvent: in: ev:${JSON.stringify(ev)}, subscriptionMap:${JSON.stringify(subscriptionMap)}`);

        const mapKey = `${ev.eventSourceId}:${ev.principal}:${ev.principalValue}`;
        let subscriptions = subscriptionMap[mapKey];
        if (subscriptions===undefined) {
            subscriptions = await this.subscriptionDao.listSubscriptionsForEventMessage(ev.eventSourceId, ev.principal, ev.principalValue);
            if (subscriptions!==undefined && subscriptions.length>0) {
                for(const sub of subscriptions) {
                    this.eventConditionsUtils.populateParameters(sub.event.conditions,sub.ruleParameterValues);
                }
                subscriptionMap[mapKey]=subscriptions;
            }
        }

        logger.debug(`filter.service listSubscriptionsForEvent: exit: subscriptions:${JSON.stringify(subscriptions)}`);
        return subscriptions;
    }

}
