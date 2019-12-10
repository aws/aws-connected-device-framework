/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { MessageCompilerService } from './messageCompiler.service';
import { MessageCompilerDao } from './messageCompiler.dao';
import { MessageTemplates } from './messageCompiler.model';

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
        const mockedResponse:MessageTemplates= {
            supportedTargets: {
                mail: 'default',
                sms: 'small'
            },
            templates: {
                default: 'default {{=it.thingName}}',
                small: 'small {{=it.thingName}}'
            }
        };
        const mockedQuery = mockedMessageCompilerDao.getEventConfig = jest.fn().mockImplementationOnce(()=> mockedResponse);

        // execute
        const actual = await instance.compile(eventId, 'sms', attributes);

        // verification
        expect(actual).toEqual('small myDogBowl');
        expect(mockedQuery).toBeCalledWith(eventId);

    });
});
