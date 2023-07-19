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

import { createMockInstance } from 'jest-create-mock-instance';
import { MessageCompilerDao } from './messageCompiler.dao';
import { MessageTemplates } from './messageCompiler.model';
import { MessageCompilerService } from './messageCompiler.service';

describe('MessageCompiler', () => {
    let mockedMessageCompilerDao: jest.Mocked<MessageCompilerDao>;
    let instance: MessageCompilerService;

    beforeEach(() => {
        mockedMessageCompilerDao = createMockInstance(MessageCompilerDao);
        instance = new MessageCompilerService(mockedMessageCompilerDao);
    });

    it('message compiled succesfully', async () => {
        const eventId = 'event001';
        const attributes = {
            notUsedAttribute: 'something',
            thingName: 'myDogBowl',
        };

        // mocks
        const mockedResponse: MessageTemplates = {
            supportedTargets: {
                mail: 'default',
                sms: 'small',
            },
            templates: {
                default: 'default {{=it.thingName}}',
                small: 'small {{=it.thingName}}',
            },
        };
        const mockedQuery = (mockedMessageCompilerDao.getEventConfig = jest
            .fn()
            .mockImplementationOnce(() => mockedResponse));

        // execute
        const actual = await instance.compile(eventId, 'sms', attributes);

        // verification
        expect(actual).toEqual('small myDogBowl');
        expect(mockedQuery).toBeCalledWith(eventId);
    });
});
