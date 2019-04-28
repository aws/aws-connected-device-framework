/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { MessageCompilerService } from './messageCompiler.service';
import { MessageCompilerDao } from './messageCompiler.dao';

describe('MessageCompiler', () => {

    let mockedMessageCompilerDao: jest.Mocked<MessageCompilerDao>;
    let instance: MessageCompilerService;

    beforeEach(() => {
        mockedMessageCompilerDao = createMockInstance(MessageCompilerDao);
        instance = new MessageCompilerService(mockedMessageCompilerDao);
    });

    it('message compiled succesfully', async() => {

        const eventId = 'event001';
        const attributes = {
            notUsedAttribute: 'something',
            thingName: 'myDogBowl'
        };

        // mocks
        const mockedResponse= {
            default: 'default {{=it.thingName}}',
            sns: 'sns {{=it.thingName}}',
            iotCore: 'iotCore {{=it.thingName}}'
        };
        const mockedQuery = mockedMessageCompilerDao.listTemplates = jest.fn().mockImplementationOnce(()=> mockedResponse);

        // execute
        const actual = await instance.compile(eventId, 'sns', attributes);

        // verification
        expect(actual).toEqual('sns myDogBowl');
        expect(mockedQuery).toBeCalledWith(eventId);

    });

    it('message compiles using default template when no specific template available', async() => {

        const eventId = 'event001';
        const attributes = {
            notUsedAttribute: 'something',
            thingName: 'myDogBowl'
        };

        // mocks
        const mockedResponse= {
            default: 'default {{=it.thingName}}',
            iotCore: 'iotCore {{=it.thingName}}'
        };
        const mockedQuery = mockedMessageCompilerDao.listTemplates = jest.fn().mockImplementationOnce(()=> mockedResponse);

        // execute
        const actual = await instance.compile(eventId, 'sns', attributes);

        // verification
        expect(actual).toEqual('default myDogBowl');
        expect(mockedQuery).toBeCalledWith(eventId);

    });
});
