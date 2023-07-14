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
import 'reflect-metadata';
import { EventConditions, EventConditionsUtils } from './event.models';

describe('EventModel', () => {
    let instance: EventConditionsUtils;

    beforeEach(() => {
        instance = new EventConditionsUtils();
    });

    it('should extract parameters from value', () => {
        const conditions: EventConditions = {
            all: [
                {
                    fact: 'batteryLevel',
                    operator: 'lessThanInclusive',
                    value: '$batteryThreshold',
                },
            ],
            any: [
                {
                    fact: 'temperatureLevel',
                    operator: 'lessThanInclusive',
                    value: '$temperatureThreshold',
                },
            ],
        };

        const expectedParameters = ['batteryThreshold', 'temperatureThreshold'];
        const templateParameters = instance.extractParameters(conditions);
        expect(templateParameters).toEqual(expectedParameters);
    });

    it('should handle condition without parameter', () => {
        const conditions: EventConditions = {
            all: [
                {
                    fact: 'batteryLevel',
                    operator: 'lessThanInclusive',
                    value: '3',
                },
            ],
        };

        const templateParameters = instance.extractParameters(conditions);
        expect(templateParameters).toEqual([]);
    });

    it('should populate parameters using the input', () => {
        const conditions: EventConditions = {
            all: [
                {
                    fact: 'batteryLevel',
                    operator: 'lessThanInclusive',
                    value: '$batteryThreshold',
                },
            ],
            any: [
                {
                    fact: 'temperatureLevel',
                    operator: 'lessThanInclusive',
                    value: '$temperatureThreshold',
                },
            ],
        };

        const expectedConditions = {
            all: [
                {
                    fact: 'batteryLevel',
                    operator: 'lessThanInclusive',
                    value: 2,
                },
            ],
            any: [
                {
                    fact: 'temperatureLevel',
                    operator: 'lessThanInclusive',
                    value: 10,
                },
            ],
        };

        instance.populateParameters(conditions, { batteryThreshold: 2, temperatureThreshold: 10 });
        expect(conditions).toEqual(expectedConditions);
    });
});
