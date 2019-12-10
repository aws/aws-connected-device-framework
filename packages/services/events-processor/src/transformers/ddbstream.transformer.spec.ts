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
import { CommonEvent } from './transformers.model';

const readFileAsync = util.promisify(fs.readFile);

describe('DDBStreamTransformer', () => {
    let mockedDao: jest.Mocked<EventSourceDao>;
    let instance: DDBStreamTransformer;

    beforeEach(() => {
        mockedDao = createMockInstance(EventSourceDao);
        instance = new DDBStreamTransformer(mockedDao);
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
        const event = JSON.parse(await readFileAsync(path.join(__dirname, 'testResources/ddbStream-event-invalid-eventSource.json'), {encoding: 'utf8'}));

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

});
