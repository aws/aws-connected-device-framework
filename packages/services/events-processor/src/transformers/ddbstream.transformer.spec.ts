/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { createMockInstance } from 'jest-create-mock-instance';
import { EventSourceDao } from '../api/eventsources/eventsource.dao';
import { DDBStreamTransformer } from './ddbstream.transformer';
import { EventSourceItem, EventSourceType } from '../api/eventsources/eventsource.models';
import { CommonEvent } from './transformers.model';

const readFileAsync = util.promisify(fs.readFile);

describe('DDBStreamTransformer', () => {
    let mockedDao: jest.Mocked<EventSourceDao>;
    let instance: DDBStreamTransformer;

    beforeEach(() => {
        mockedDao = createMockInstance(EventSourceDao);
        instance = new DDBStreamTransformer(mockedDao);
    });

    it('only inserts and updates transformed', async() => {
        // stubs
        const eventSourceId = 'arn:aws:dynamodb:us-west-2:123456789012:table/ExampleTableWithStream';
        const eventSource = stubbedEventSource(eventSourceId, 'My Source', 'Device', true);
        const event = JSON.parse(await readFileAsync(path.join(__dirname, 'testResources/ddbStream-event-valid.json'), {encoding: 'utf8'}));

        const expected:CommonEvent[] = [
            {
                eventSourceId,
                principal: 'Device',
                principalValue: 'A101',
                attributes: {
                    Device: 'A101',
                    Message: 'New item!',
                    Count: 1,
                    Enabled: true
                }
            }, {
                eventSourceId,
                principal: 'Device',
                principalValue: 'A102',
                attributes: {
                    Device: 'A102',
                    Message: 'This item has changed',
                    Colors: ['red','amber','green'],
                    Brackets: [1000,2000,3000]
                }
            }
        ];

        // mocks
        mockedDao.get = jest.fn().mockImplementation(()=> eventSource);

        // execute
        const actual = await instance.transform(event);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('unrecognized eventSourceARN', async() => {
        // stubs
        const event = JSON.parse(await readFileAsync(path.join(__dirname, 'testResources/ddbStream-event-valid.json'), {encoding: 'utf8'}));

        const expected:CommonEvent[] = [];

        // mocks
        mockedDao.get = jest.fn().mockImplementation(()=> undefined);

        // execute
        const actual = await instance.transform(event);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    it('unrecognized eventSource type', async() => {
        // stubs
        const event = JSON.parse(await readFileAsync(path.join(__dirname, 'testResources/ddbStream-event-invalid-eventsource.json'), {encoding: 'utf8'}));

        const expected:CommonEvent[] = [];

        // mocks
        mockedDao.get = jest.fn().mockImplementation(()=> undefined);

        // execute
        const actual = await instance.transform(event);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    it('missing principal', async() => {
        // stubs
        const event = JSON.parse(await readFileAsync(path.join(__dirname, 'testResources/ddbStream-event-invalid-missing-principal.json'), {encoding: 'utf8'}));

        const expected:CommonEvent[] = [];

        // mocks
        mockedDao.get = jest.fn().mockImplementation(()=> undefined);

        // execute
        const actual = await instance.transform(event);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    function stubbedEventSource(eventSourceId:string, name:string,  principal:string, enabled:boolean) {
        const eventSource:EventSourceItem = {
            id: eventSourceId,
            name,
            sourceType: EventSourceType.DynamoDB,
            principal,
            enabled
        };
        return eventSource;
    }

});
