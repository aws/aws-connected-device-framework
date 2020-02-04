/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { EventConditionsUtils } from './event.models';
import { EventAssembler } from './event.assembler';
import { createMockInstance } from 'jest-create-mock-instance';

describe('EventAssembler', () => {
    let mockedEventConditionsUtil: jest.Mocked<EventConditionsUtils>;
    let instance: EventAssembler;

    beforeEach(() => {
        mockedEventConditionsUtil = createMockInstance(EventConditionsUtils);
        instance = new EventAssembler(mockedEventConditionsUtil);
    });

    it('should parse out the templates', async () => {
        const EventConfig = {
            'supportedTargets': {
                'sms': 'default',
                'email': 'default',
                'dynamodb': 'default'
            },
            'templates': {
                'default': 'The device {{=it.principalValue}} has exceeded the threshold event.',
                'default2': 'The device {{=it[\'pneumatic.air_pressure_threshold__1\']}} has exceeded the threshold event.',
                'default3': 'The device {{=it[\'pneumatic.air_pressure_threshold__1\'] || =it.foo && =it[\'fizzbuzz\'] || =it.principalValue}}',
            }
        };

        const expectedKeys = ['principalValue', 'pneumatic.air_pressure_threshold__1', 'foo', 'fizzbuzz'];

        // @ts-ignore
        const templateKeys = await instance.extractTemplateProperties(EventConfig.templates);

        expect(templateKeys).toEqual(expectedKeys);
    });

    it('should gracefully handle if templates is undefined', async () => {
        const EventConfig = {
            'supportedTargets': {}
        };

        // @ts-ignore
        const templateKeys = await instance.extractTemplateProperties(EventConfig.templates);

        expect(templateKeys).toEqual([]);
    });

    it('should gracefully handle if templates are null', async () => {
        const EventConfig = {
            'supportedTargets': {},
            'templates': {}
        };

        // @ts-ignore
        const templateKeys = await instance.extractTemplateProperties(EventConfig.templates);

        expect(templateKeys).toEqual([]);
    });

});
