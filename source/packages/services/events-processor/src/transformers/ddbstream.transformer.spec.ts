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
