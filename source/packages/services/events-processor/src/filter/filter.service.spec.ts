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
import { createMockInstance } from 'jest-create-mock-instance';
import 'reflect-metadata';
import { AlertDao } from '../alerts/alert.dao';
import { AlertItem } from '../alerts/alert.models';
import { EventDao } from '../api/events/event.dao';
import { EventConditionsUtils } from '../api/events/event.models';
import { SubscriptionDao } from '../api/subscriptions/subscription.dao';
import { SubscriptionItem } from '../api/subscriptions/subscription.models';
import { CommonEvent } from '../transformers/transformers.model';
import { FilterService } from './filter.service';

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
        instance = new FilterService(
            mockedSubscriptionDao,
            mockedAlertDao,
            mockedEventConditionsUtils,
            mockedEventDao,
        );
    });

    it('happy path', async () => {
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
        const events: CommonEvent[] = [
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 1,
                    batteryLevel: 25,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 2,
                    batteryLevel: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 3,
                    batteryLevel: 18,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 21,
                },
            },
        ];

        // mocks
        const mockedListCall = (mockedSubscriptionDao.listSubscriptionsForEventMessage = jest
            .fn()
            .mockImplementationOnce(() => {
                const r: SubscriptionItem[] = [
                    {
                        id: 'sub001',
                        event: {
                            id: 'ev001',
                            name: 'batteryAlertLevel',
                            conditions: {
                                all: [
                                    {
                                        fact: 'batteryLevel',
                                        operator: 'lessThanInclusive',
                                        value: 20,
                                    },
                                ],
                            },
                        },
                        eventSource: {
                            id: eventSourceId,
                            principal,
                        },
                        principalValue,
                        ruleParameterValues: {},
                        alerted: false,
                        enabled: true,
                        user: {
                            id: 'u001',
                        },
                    },
                ];
                return r;
            }));

        const mockedGetEventConfigCall = (mockedEventDao.getEventConfig = jest
            .fn()
            .mockImplementation(() => {
                return {
                    supportedTargets: {
                        sms: 'default',
                        email: 'default2',
                    },
                    templates: {
                        default: 'The Battery level is {{=it.batterylevel}}',
                        default2: "{{=it['threshold']}} and {{=it.sequence}}",
                    },
                    templateProperties: ['batteryLevel', 'threshold', 'sequence'],
                };
            }));

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
        const mockedCreateAlertsCall = (mockedAlertDao.create = jest
            .fn()
            .mockImplementationOnce((_alerts) => {
                // do nothing, acting as a spy only
            }));

        // execute
        await instance.filter(events);

        // verify
        expect(mockedListCall).toBeCalledTimes(1);
        expect(mockedCreateAlertsCall).toBeCalledTimes(1);
        expect(mockedGetEventConfigCall).toBeCalled();
    });

    it('rule checking fact against fact', async () => {
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
        const events: CommonEvent[] = [
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 1,
                    batteryLevel: 25,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 2,
                    batteryLevel: 22,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 3,
                    batteryLevel: 18,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 14,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 23,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 12,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 10,
                    batteryLevelThreshold: 22,
                },
            },
        ];

        // mocks
        const mockedListCall = (mockedSubscriptionDao.listSubscriptionsForEventMessage = jest
            .fn()
            .mockImplementationOnce(() => {
                const r: SubscriptionItem[] = [
                    {
                        id: 'sub001',
                        event: {
                            id: 'ev001',
                            name: 'batteryAlertLevel',
                            conditions: {
                                all: [
                                    {
                                        fact: 'batteryLevel',
                                        operator: 'lessThan',
                                        value: {
                                            fact: 'batteryLevelThreshold',
                                        },
                                    },
                                ],
                            },
                        },
                        eventSource: {
                            id: eventSourceId,
                            principal,
                        },
                        principalValue,
                        ruleParameterValues: {},
                        alerted: false,
                        enabled: true,
                        user: {
                            id: 'u001',
                        },
                    },
                ];
                return r;
            }));

        const mockedGetEventConfigCall = (mockedEventDao.getEventConfig = jest
            .fn()
            .mockImplementation(() => {
                return {
                    supportedTargets: {
                        sms: 'default',
                        email: 'default2',
                    },
                    templates: {
                        default: 'The Battery level is {{=it.batterylevel}}',
                        default2: "{{=it['threshold']}} and {{=it.sequence}}",
                    },
                    templateProperties: ['batteryLevel', 'threshold', 'sequence'],
                };
            }));

        const mockedCreateAlertsCall = (mockedAlertDao.create = jest
            .fn()
            .mockImplementationOnce((_alerts) => {
                // do nothing, acting as a spy only
            }));

        // execute
        await instance.filter(events);

        // verify
        expect(mockedListCall).toBeCalledTimes(1);
        expect(mockedCreateAlertsCall).toBeCalledTimes(1);
        const actualAlerts: AlertItem[] = mockedCreateAlertsCall.mock.calls[0][0];
        expect(actualAlerts.length).toBe(2); // only 2 should be alerted
        expect(mockedGetEventConfigCall).toBeCalled();
    });

    it('disabling alert thresholds should alert each time', async () => {
        const eventSourceId = 'ES123';
        const principal = 'deviceId';
        const principalValue = 'device001';

        // stubs
        const commonMessageAttributes = {
            eventSourceId,
            principal,
            principalValue,
        };

        // going from 25 > 22 > 18 (triggered) > 14 (still triggers) > 23 > 12 (still triggers) > 10 (istill triggers)
        const events: CommonEvent[] = [
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 1,
                    batteryLevel: 25,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 2,
                    batteryLevel: 22,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 3,
                    batteryLevel: 18,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 14,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 23,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 12,
                    batteryLevelThreshold: 22,
                },
            },
            {
                ...commonMessageAttributes,
                attributes: {
                    sequence: 4,
                    batteryLevel: 10,
                    batteryLevelThreshold: 22,
                },
            },
        ];

        // mocks
        const mockedListCall = (mockedSubscriptionDao.listSubscriptionsForEventMessage = jest
            .fn()
            .mockImplementationOnce(() => {
                const r: SubscriptionItem[] = [
                    {
                        id: 'sub001',
                        event: {
                            id: 'ev001',
                            name: 'batteryAlertLevel',
                            conditions: {
                                all: [
                                    {
                                        fact: 'batteryLevel',
                                        operator: 'lessThan',
                                        value: {
                                            fact: 'batteryLevelThreshold',
                                        },
                                    },
                                ],
                            },
                            disableAlertThreshold: true,
                        },
                        eventSource: {
                            id: eventSourceId,
                            principal,
                        },
                        principalValue,
                        ruleParameterValues: {},
                        alerted: false,
                        enabled: true,
                        user: {
                            id: 'u001',
                        },
                    },
                ];
                return r;
            }));

        const mockedGetEventConfigCall = (mockedEventDao.getEventConfig = jest
            .fn()
            .mockImplementation(() => {
                return {
                    supportedTargets: {
                        sms: 'default',
                        email: 'default2',
                    },
                    templates: {
                        default: 'The Battery level is {{=it.batterylevel}}',
                        default2: "{{=it['threshold']}} and {{=it.sequence}}",
                    },
                    templateProperties: ['batteryLevel', 'threshold', 'sequence'],
                };
            }));

        const mockedCreateAlertsCall = (mockedAlertDao.create = jest
            .fn()
            .mockImplementationOnce((_alerts) => {
                // do nothing, acting as a spy only
            }));

        // execute
        await instance.filter(events);

        // verify
        expect(mockedListCall).toBeCalledTimes(1);
        expect(mockedCreateAlertsCall).toBeCalledTimes(1);
        const actualAlerts: AlertItem[] = mockedCreateAlertsCall.mock.calls[0][0];
        expect(actualAlerts.length).toBe(4); // only 4 should be alerted
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
                    all: [
                        {
                            fact: 'batteryLevel',
                            operator: 'lessThanInclusive',
                            value: 20,
                        },
                    ],
                },
            },
            eventSource: {
                id: eventSourceId,
                principal,
            },
            principalValue,
            ruleParameterValues: {},
            alerted: false,
            enabled: true,
            user: {
                id: 'u001',
            },
        };

        const mockedEvent = {
            eventSourceId,
            principal,
            principalValue,
            sourceChangeType,
            attributes: {
                sequence: 4,
                batteryLevel: 21,
            },
        };

        const mockedTemplateCache = {};

        const mockedGetEventConfigCall = (mockedEventDao.getEventConfig = jest
            .fn()
            .mockImplementation(() => {
                return {
                    supportedTargets: {
                        sms: 'default',
                        email: 'default2',
                    },
                    templates: {
                        default: 'The Battery level is {{=it.batteryLevel}}',
                        default2: "{{=it['threshold']}} and {{=it.sequence}}",
                    },
                    templateProperties: ['batteryLevel', 'threshold', 'sequence'],
                };
            }));

        // @ts-ignore
        const attributeMap = await instance.getTemplatePropertiesData(
            mockedSubscriptionItem,
            mockedEvent,
            mockedTemplateCache,
        );
        expect(attributeMap).toEqual({
            batteryLevel: 21,
            sequence: 4,
            principalValue,
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
                    all: [
                        {
                            fact: 'batteryLevel',
                            operator: 'lessThanInclusive',
                            value: 20,
                        },
                    ],
                },
            },
            eventSource: {
                id: eventSourceId,
                principal,
            },
            principalValue,
            ruleParameterValues: {},
            alerted: false,
            enabled: true,
            user: {
                id: 'u001',
            },
        };

        const mockedEvent = {
            eventSourceId,
            principal,
            principalValue,
            sourceChangeType,
            attributes: {
                sequence: 4,
                batteryLevel: 21,
            },
        };

        const mockedTemplateCache = {};

        const mockedGetEventConfigCall = (mockedEventDao.getEventConfig = jest
            .fn()
            .mockImplementation(() => {
                return {
                    supportedTargets: {
                        sms: 'default',
                        email: 'default2',
                    },
                    templates: {
                        default: 'The Battery level is {{=it.batteryLevel}}',
                        default2: "{{=it['threshold']}} and {{=it.sequence}}",
                    },
                };
            }));

        // @ts-ignore
        const attributeMap = await instance.getTemplatePropertiesData(
            mockedSubscriptionItem,
            mockedEvent,
            mockedTemplateCache,
        );
        expect(attributeMap).toEqual({});

        expect(mockedGetEventConfigCall).toBeCalledTimes(1);
    });
});
