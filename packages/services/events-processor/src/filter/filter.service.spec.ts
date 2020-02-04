/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import 'reflect-metadata';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';
import { FilterService } from './filter.service';
import { createMockInstance } from 'jest-create-mock-instance';
import { CommonEvent } from '../transformers/transformers.model';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { AlertDao } from '../alerts/alert.dao';
import { EventDao } from '../api/events/event.dao';
import { logger } from '../utils/logger.util';
import { EventConditionsUtils } from '../api/events/event.models';

describe('FilterService', () => {
    let mockedSubscriptionDao: jest.Mocked<SubscriptionDao>;
    let mockedAlertDao: jest.Mocked<AlertDao>;
    let mockedEventConditionsUtils: jest.Mocked<EventConditionsUtils>;
    let mockedEventDao: jest.Mocked<EventDao>;
    let instance: FilterService;

    beforeEach(() => {
        mockedSubscriptionDao = createMockInstance(SubscriptionDao);
        mockedAlertDao = createMockInstance(AlertDao);
        mockedEventConditionsUtils = createMockInstance(EventConditionsUtils);
        mockedEventDao = createMockInstance(EventDao);
        instance = new FilterService(mockedSubscriptionDao, mockedAlertDao, mockedEventConditionsUtils, mockedEventDao);
    });

    it('happy path', async() => {

        const eventSourceId = 'ES123';
        const principal = 'deviceId';
        const principalValue = 'device001';
        const sourceChangeType = 'INSERT';

        // stubs
        const commonMessageAttributes = {
            eventSourceId,
            sourceChangeType,
            principal,
            principalValue,
        };
        const events:CommonEvent[]= [
            {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 1,
                    batteryLevel: 25
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 2,
                    batteryLevel: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 3,
                    batteryLevel: 18
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 21
                }
            }
        ];

        // mocks
        const mockedListCall = mockedSubscriptionDao.listSubscriptionsForEventMessage = jest.fn().mockImplementationOnce(()=> {
            logger.debug(`filter.service.spec: listSubscriptionsForEventMessage:`);
            const r:SubscriptionItem[]= [
                {
                    id: 'sub001',
                    event: {
                        id: 'ev001',
                        name: 'batteryAlertLevel',
                        conditions: {
                            all: [{
                                fact: 'batteryLevel',
                                operator: 'lessThanInclusive',
                                value: 20
                            }]
                        }
                    },
                    eventSource: {
                        id: eventSourceId,
                        principal
                    },
                    principalValue,
                    ruleParameterValues:{},
                    alerted:false,
                    enabled:true,
                    user: {
                        id: 'u001'
                    }
                }
            ];
            return r;
        });

        const mockedGetEventConfigCall = mockedEventDao.getEventConfig = jest.fn().mockImplementation(() => {
            logger.debug(`filter.service.spec: getEventConfig`);
            return {
                supportedTargets: {
                    'sms': 'default',
                    'email': 'default2'
                },
                templates: {
                    'default': 'The Battery level is {{=it.batterylevel}}',
                    'default2': '{{=it[\'threshold\']}} and {{=it.sequence}}'
                },
                templateProperties: ['batteryLevel', 'threshold', 'sequence']
            };
        });

        // const expectedAlerts:AlertItem[] = [
        //     {
        //         'time':'2019-04-19T02:23:21.632Z',
        //         'subscription':{
        //             'id':'sub001'
        //         },
        //         'event':{
        //             'id':'ev001',
        //             'name':'batteryAlertLevel'
        //         },
        //         'user':{
        //             'id':'u001'
        //         }
        //     }
        // ];
        const mockedCreateAlertsCall = mockedAlertDao.create = jest.fn().mockImplementationOnce((alerts)=> {
            // do nothing, acting as a spy only
            logger.debug(`filter.service.spec: alerts: ${JSON.stringify(alerts)}`);
        });

        // execute
        await instance.filter(events);

        // verify
        expect(mockedListCall).toBeCalledTimes(1);
        expect(mockedCreateAlertsCall).toBeCalledTimes(1);
        expect(mockedGetEventConfigCall).toBeCalled();
    });

    it('rule checking fact against fact', async() => {

        const eventSourceId = 'ES123';
        const principal = 'deviceId';
        const principalValue = 'device001';

        // stubs
        const commonMessageAttributes = {
            eventSourceId,
            principal,
            principalValue,
        };

        // going from 25 > 22 > 18 (triggered) > 14 (ignored as no reset) > 23 > 12 (ignored as no reset) > 10 (ignored as no reset)
        const events:CommonEvent[]= [
            {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 1,
                    batteryLevel: 25,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 2,
                    batteryLevel: 22,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 3,
                    batteryLevel: 18,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 14,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 23,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 12,
                    batteryLevelThreshold: 22
                }
            }, {
                ... commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 10,
                    batteryLevelThreshold: 22
                }
            }
        ];

        // mocks
        const mockedListCall = mockedSubscriptionDao.listSubscriptionsForEventMessage = jest.fn().mockImplementationOnce(()=> {
            logger.debug(`filter.service.spec: listSubscriptionsForEventMessage:`);
            const r:SubscriptionItem[]= [
                {
                    id: 'sub001',
                    event: {
                        id: 'ev001',
                        name: 'batteryAlertLevel',
                        conditions: {
                            all: [{
                                fact: 'batteryLevel',
                                operator: 'lessThan',
                                value: {
                                    fact: 'batteryLevelThreshold'
                                }
                            }]
                        }
                    },
                    eventSource: {
                        id: eventSourceId,
                        principal
                    },
                    principalValue,
                    ruleParameterValues:{},
                    alerted:false,
                    enabled:true,
                    user: {
                        id: 'u001'
                    }
                }
            ];
            return r;
        });

        const mockedGetEventConfigCall = mockedEventDao.getEventConfig = jest.fn().mockImplementation(() => {
            logger.debug(`filter.service.spec: getEventConfig`);
            return {
                supportedTargets: {
                    'sms': 'default',
                    'email': 'default2'
                },
                templates: {
                    'default': 'The Battery level is {{=it.batterylevel}}',
                    'default2': '{{=it[\'threshold\']}} and {{=it.sequence}}'
                },
                templateProperties: ['batteryLevel', 'threshold', 'sequence']
            };
        });

        const mockedCreateAlertsCall = mockedAlertDao.create = jest.fn().mockImplementationOnce((alerts)=> {
            // do nothing, acting as a spy only
            logger.debug(`filter.service.spec: alerts: ${JSON.stringify(alerts)}`);
        });

        // execute
        await instance.filter(events);

        // verify
        expect(mockedListCall).toBeCalledTimes(1);
        expect(mockedCreateAlertsCall).toBeCalledTimes(1);
        expect(mockedGetEventConfigCall).toBeCalled();
    });

    it('should return a attributes for an event', async () => {
        const eventSourceId = 'ES123';
        const principal = 'deviceId';
        const principalValue = 'device001';
        const sourceChangeType = 'INSERT';

        const mockedSubscriptionItem = {
            id: 'sub001',
            event: {
                id: 'ev001',
                name: 'batteryAlertLevel',
                conditions: {
                    all: [{
                        fact: 'batteryLevel',
                        operator: 'lessThanInclusive',
                        value: 20
                    }]
                }
            },
            eventSource: {
                id: eventSourceId,
                principal
            },
            principalValue,
            ruleParameterValues:{},
            alerted:false,
            enabled:true,
            user: {
                id: 'u001'
            }
        };

        const mockedEvent = {
            eventSourceId,
            principal,
            principalValue,
            sourceChangeType,
            attributes: {
                sequence: 4,
                batteryLevel: 21
            }
        };

        const mockedTemplateCache = {};

        const mockedGetEventConfigCall = mockedEventDao.getEventConfig = jest.fn().mockImplementation(() => {
            logger.debug(`filter.service.spec: getEventConfig`);
            return {
                supportedTargets: {
                    'sms': 'default',
                    'email': 'default2'
                },
                templates: {
                    'default': 'The Battery level is {{=it.batteryLevel}}',
                    'default2': '{{=it[\'threshold\']}} and {{=it.sequence}}'
                },
                templateProperties: ['batteryLevel', 'threshold', 'sequence']
            };
        });

        // @ts-ignore
        const attributeMap = await instance.getTemplatePropertiesData(mockedSubscriptionItem, mockedEvent, mockedTemplateCache);
        expect(attributeMap).toEqual({
            batteryLevel: 21,
            sequence: 4
        });

        expect(mockedGetEventConfigCall).toBeCalledTimes(1);
    });

    it('should handle undefined templateProperties gracefully ', async () => {
        const eventSourceId = 'ES123';
        const principal = 'deviceId';
        const principalValue = 'device001';
        const sourceChangeType = 'INSERT';

        const mockedSubscriptionItem = {
            id: 'sub001',
            event: {
                id: 'ev001',
                name: 'batteryAlertLevel',
                conditions: {
                    all: [{
                        fact: 'batteryLevel',
                        operator: 'lessThanInclusive',
                        value: 20
                    }]
                }
            },
            eventSource: {
                id: eventSourceId,
                principal
            },
            principalValue,
            ruleParameterValues:{},
            alerted:false,
            enabled:true,
            user: {
                id: 'u001'
            }
        };

        const mockedEvent = {
            eventSourceId,
            principal,
            principalValue,
            sourceChangeType,
            attributes: {
                sequence: 4,
                batteryLevel: 21
            }
        };

        const mockedTemplateCache = {};

        const mockedGetEventConfigCall = mockedEventDao.getEventConfig = jest.fn().mockImplementation(() => {
            logger.debug(`filter.service.spec: getEventConfig`);
            return {
                supportedTargets: {
                    'sms': 'default',
                    'email': 'default2'
                },
                templates: {
                    'default': 'The Battery level is {{=it.batteryLevel}}',
                    'default2': '{{=it[\'threshold\']}} and {{=it.sequence}}'
                }
            };
        });

        // @ts-ignore
        const attributeMap = await instance.getTemplatePropertiesData(mockedSubscriptionItem, mockedEvent, mockedTemplateCache);
        expect(attributeMap).toEqual({});

        expect(mockedGetEventConfigCall).toBeCalledTimes(1);
    });

});
