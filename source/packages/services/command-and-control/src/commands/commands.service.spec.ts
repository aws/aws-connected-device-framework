/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import 'reflect-metadata';

import { SQS } from 'aws-sdk';
import { createMockInstance } from 'jest-create-mock-instance';

import { MessagesService } from '../messages/messages.service';
import { CommandsDao } from './commands.dao';
import { CommandItem, JobDeliveryMethod } from './commands.models';
import { CommandsService } from './commands.service';
import { CommandsValidator } from './commands.validator';
import { CommandListIdsByTagPaginationKey } from './commands.models';

describe('CommandsService', () => {

    let mockedDao: jest.Mocked<CommandsDao>;
    let mockedValidator: jest.Mocked<CommandsValidator>;
    let mockedMessagesService: jest.Mocked<MessagesService>;
    let mockedSQS: SQS;
    let underTest: CommandsService;

    beforeEach(() => {
        mockedDao = createMockInstance(CommandsDao);
        mockedValidator = createMockInstance(CommandsValidator);
        mockedSQS = new SQS;
        const mockedSQSFactory = () => {
            return mockedSQS;
        };
        underTest = new CommandsService(10, 'queueUrl', mockedValidator, mockedDao, mockedMessagesService, mockedSQSFactory);
    });

    it('update - happy path', async() => {

        // stubs
        const existing:CommandItem = {
            id: 'tLKhjhcuQ',
            operation: 'otau',
            deliveryMethod: {
                expectReply: true,
                type: 'JOB'
            },
            payloadTemplate: "{\"package\": \"${aws:iot:s3-presigned-url:https://s3.us-west-2.amazonaws.com/cdf-157731826412-us-west-2/testfile.zip}\"}",
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const updated:CommandItem = {
            id: 'tLKhjhcuQ',
            payloadTemplate: "{\"package\": \"${aws:iot:s3-presigned-url:${s3Location}}\"}",
            payloadParams: ['s3Location']
        }

        // mocks
        mockedDao.get = jest.fn().mockResolvedValueOnce([existing]);
        mockedValidator.validate = jest.fn().mockResolvedValueOnce(undefined);
        mockedDao.save = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        await underTest.update(updated);

        // verify
        const merged = mockedDao.save.mock.calls[0][0];
        console.log(`merged: ${JSON.stringify(merged)}`);
        expect(merged).toBeDefined();
        expect(merged.id).toEqual(existing.id);
        expect(merged.operation).toEqual(existing.operation);
        expect(merged.deliveryMethod.type).toEqual(existing.deliveryMethod.type);
        expect(merged.deliveryMethod.expectReply).toEqual(existing.deliveryMethod.expectReply);
        expect(merged.payloadTemplate).toEqual(updated.payloadTemplate);
        expect(merged.payloadParams).toEqual(updated.payloadParams);
        expect(new Date(merged.createdAt)).toEqual(existing.createdAt);
        expect(new Date(merged.updatedAt)).not.toEqual(existing.updatedAt);
    });

    it('update - don\'t merge arrays', async() => {

        // stubs
        const existing:CommandItem = {
            id: '12tLKhjhcuQ3',
            operation: 'otau',
            deliveryMethod: {
                type: 'JOB',
                expectReply: true,
                abortConfig: {
                    criteriaList: [{
                        action: 'ABORT',
                        failureType: 'TIMEOUT',
                        minNumberOfExecutedThings: 1,
                        thresholdPercentage : 0.5
                    }],
                },
            },
            payloadTemplate: "{\"package\": \"${aws:iot:s3-presigned-url:https://s3.us-west-2.amazonaws.com/cdf-157731826412-us-west-2/testfile.zip}\"}",
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const updated:CommandItem = {
            id: 'tLKhjhcuQ',
            deliveryMethod: {
                type: 'JOB',
                expectReply: true,
                abortConfig: {
                    criteriaList: [{
                        action: 'ABORT',
                        failureType: 'TIMEOUT',
                        minNumberOfExecutedThings: 2,
                        thresholdPercentage : 0.75
                    }],
                },
            },
        }

        // mocks
        mockedDao.get = jest.fn().mockResolvedValueOnce([existing]);
        mockedValidator.validate = jest.fn().mockResolvedValueOnce(undefined);
        mockedDao.save = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        await underTest.update(updated);

        // verify
        const merged = mockedDao.save.mock.calls[0][0];
        console.log(`merged: ${JSON.stringify(merged)}`);
        expect(merged).toBeDefined();
        const mergedDeliveryMethod = merged.deliveryMethod as JobDeliveryMethod;
        expect(mergedDeliveryMethod.type).toEqual(existing.deliveryMethod.type);
        expect(mergedDeliveryMethod.expectReply).toEqual(existing.deliveryMethod.expectReply);
        expect(mergedDeliveryMethod.abortConfig?.criteriaList?.length).toEqual(1);
        const updatedDeliveryMethod = updated.deliveryMethod as JobDeliveryMethod;
        expect(mergedDeliveryMethod.abortConfig?.criteriaList?.[0].action).toEqual(updatedDeliveryMethod.abortConfig.criteriaList[0].action);
        expect(mergedDeliveryMethod.abortConfig?.criteriaList?.[0].failureType).toEqual(updatedDeliveryMethod.abortConfig.criteriaList[0].failureType);
        expect(mergedDeliveryMethod.abortConfig?.criteriaList?.[0].minNumberOfExecutedThings).toEqual(updatedDeliveryMethod.abortConfig.criteriaList[0].minNumberOfExecutedThings);
        expect(mergedDeliveryMethod.abortConfig?.criteriaList?.[0].thresholdPercentage).toEqual(updatedDeliveryMethod.abortConfig.criteriaList[0].thresholdPercentage);
    });

    it('update - changing deliveryMethod type is not allowed', async() => {

        // stubs
        const existing:CommandItem = {
            id: '12tLKhjhcuQ3',
            operation: 'otau',
            deliveryMethod: {
                type: 'JOB',
                expectReply: true,
            },
            payloadTemplate: "{\"something\": \"xyz\"}",
            createdAt: new Date()
        }

        const updated:CommandItem = {
            id: 'tLKhjhcuQ',
            deliveryMethod: {
                type: 'TOPIC',
                expectReply: true,
                onlineOnly: true
            },
        }

        // mocks
        mockedDao.get = jest.fn().mockResolvedValueOnce([existing]);
        
        // execute and verify
        const functionUnderTest = async () => {
            await underTest.update(updated);
        }
        await expect(functionUnderTest()).rejects.toThrow('FAILED_VALIDATION: updating delivery method type is not allowed');
        
    });

    it('update - existing command not found throws error', async() => {

        // stubs
        const updated:CommandItem = {
            id: 'tLKhjhcuQ',
            deliveryMethod: {
                type: 'TOPIC',
                expectReply: true,
                onlineOnly: true
            },
        }

        // mocks
        mockedDao.get = jest.fn().mockResolvedValueOnce(undefined);
        
        // execute and verify
        const functionUnderTest = async () => {
            await underTest.update(updated);
        }
        await expect(functionUnderTest()).rejects.toThrow('NOT_FOUND');
        
    });


    it('listIds - happy path', async() => {

        // mocks
        const idsForTagAPage1 = ['c01','c02','c03','c04','c05','c06','c07','c08'];
        const idsForTagAPage2 = ['c09','c10','c11','c12','c13','c14','c15','c16'];
        const idsForTagBPage1 = ['c04','c05','c06','c07','c08','c09','c10','c11'];
        const idsForTagBPage2 = ['c12','c13','c14'];
        const idsForTagCPage1 = ['c02','c04','c06','c08','c10','c12','c14'];

        mockedDao.listIds = jest.fn().mockImplementation((tagKey: string, tagValue: string, exclusiveStart?:CommandListIdsByTagPaginationKey, _count?:number) : Promise<[string[],CommandListIdsByTagPaginationKey]> => {
            let result : [string[],CommandListIdsByTagPaginationKey] = [undefined, undefined];
            switch (tagKey) {
                case 'A':   
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagAPage1, { tagKey,tagValue,commandId: 'c08' }];
                    } else if (exclusiveStart.commandId==='c08') {
                        result = [idsForTagAPage2, undefined];
                    } 
                    break;
                case 'B':
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagBPage1, { tagKey,tagValue,commandId: 'c11' }];
                    } else if (exclusiveStart.commandId==='c11') {
                        result = [idsForTagBPage2, undefined];
                    } 
                    break;
                case 'C':
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagCPage1, undefined];
                    }
                    break;
                default:
                    break;
            }
            return Promise.resolve(result);
        });

        // execute
        const [ids,_pagination] = await underTest.listIds({'A':'1','B':'2','C':'3'});

        expect(ids).toBeDefined();
        expect(ids.length).toEqual(6);
        expect(ids[0]).toEqual('c04');
        expect(ids[1]).toEqual('c06');
        expect(ids[2]).toEqual('c08');
        expect(ids[3]).toEqual('c10');
        expect(ids[4]).toEqual('c12');
        expect(ids[5]).toEqual('c14');

    });

    it('listIds - happy path (paginated - 1st page)', async() => {

        // mocks
        const idsForTagAPage1 = ['c01','c02','c03','c04'];
        const idsForTagAPage2 = ['c05','c06','c07','c08'];
        const idsForTagAPage3 = ['c09','c10','c11','c12'];
        const idsForTagAPage4 = ['c13','c14','c15','c16'];
        const idsForTagBPage1 = ['c04','c05','c06','c07'];
        const idsForTagBPage2 = ['c08','c09','c10','c11'];
        const idsForTagBPage3 = ['c12','c13','c14'];
        const idsForTagCPage1 = ['c02','c04','c06','c08'];
        const idsForTagCPage2 = ['c10','c12','c14'];

        mockedDao.listIds = jest.fn().mockImplementation((tagKey: string, tagValue: string, exclusiveStart?:CommandListIdsByTagPaginationKey, _count?:number) : Promise<[string[],CommandListIdsByTagPaginationKey]> => {
            let result : [string[],CommandListIdsByTagPaginationKey] = [undefined, undefined];
            switch (tagKey) {
                case 'A':   
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagAPage1, { tagKey,tagValue,commandId: 'c04' }];
                    } else if (exclusiveStart?.commandId==='c04') {
                        result = [idsForTagAPage2, { tagKey,tagValue,commandId: 'c08' }];
                    } else if (exclusiveStart?.commandId==='c08') {
                        result = [idsForTagAPage3, { tagKey,tagValue,commandId: 'c12' }];
                    } else if (exclusiveStart?.commandId==='c12') {
                        result = [idsForTagAPage4, { tagKey,tagValue,commandId: 'c16' }];
                    } 
                    break;
                case 'B':
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagBPage1, { tagKey,tagValue,commandId: 'c07' }];
                    } else if (exclusiveStart?.commandId==='c07') {
                        result = [idsForTagBPage2, { tagKey,tagValue,commandId: 'c11' }];
                    } else if (exclusiveStart?.commandId==='c11') {
                        result = [idsForTagBPage3, undefined];
                    } 
                    break;
                case 'C':
                    if (exclusiveStart?.commandId===undefined) {
                        result = [idsForTagCPage1, { tagKey,tagValue,commandId: 'c08' }];
                    } else if (exclusiveStart?.commandId==='c08') {
                        result = [idsForTagCPage2, undefined];
                    } 
                    break;
                default:
                    break;
            }
            return Promise.resolve(result);
        });

        // execute
        const [ids,pagination] = await underTest.listIds({'A':'1','B':'2','C':'3'}, undefined, 4);

        expect(ids).toBeDefined();
        expect(ids.length).toEqual(4);
        expect(ids[0]).toEqual('c04');
        expect(ids[1]).toEqual('c06');
        expect(ids[2]).toEqual('c08');
        expect(ids[3]).toEqual('c10');
        expect(pagination).toBeDefined();
        expect(pagination.commandId).toEqual('c10');
    });


    it('listIds - happy path (paginated - 2nd page)', async() => {

        // mocks
        const idsForTagAPage1 = ['c05','c06','c07','c08'];
        const idsForTagAPage2 = ['c09','c10','c11','c12'];
        const idsForTagAPage3 = ['c13','c14','c15','c16'];
        const idsForTagBPage1 = ['c05','c06','c07','c08'];
        const idsForTagBPage2 = ['c09','c10','c11','c12'];
        const idsForTagBPage3 = ['c13','c14'];
        const idsForTagCPage1 = ['c06','c08','c10','c12'];
        const idsForTagCPage2 = ['c14'];

        mockedDao.listIds = jest.fn().mockImplementation((tagKey: string, tagValue: string, exclusiveStart?:CommandListIdsByTagPaginationKey, _count?:number) : Promise<[string[],CommandListIdsByTagPaginationKey]> => {
            let result : [string[],CommandListIdsByTagPaginationKey] = [undefined, undefined];
            switch (tagKey) {
                case 'A':   
                    if (exclusiveStart?.commandId==='c04') {
                        result = [idsForTagAPage1, { tagKey,tagValue,commandId: 'c08' }];
                    } else if (exclusiveStart?.commandId==='c08') {
                        result = [idsForTagAPage2, { tagKey,tagValue,commandId: 'c12' }];
                    } else if (exclusiveStart?.commandId==='c12') {
                        result = [idsForTagAPage3, { tagKey,tagValue,commandId: 'c16' }];
                    } 
                    break;
                case 'B':
                    if (exclusiveStart?.commandId==='c04') {
                        result = [idsForTagBPage1, { tagKey,tagValue,commandId: 'c08' }];
                    } else if (exclusiveStart?.commandId==='c08') {
                        result = [idsForTagBPage2, { tagKey,tagValue,commandId: 'c12' }];
                    } else if (exclusiveStart?.commandId==='c12') {
                        result = [idsForTagBPage3, undefined];
                    } 
                    break;
                case 'C':
                    if (exclusiveStart?.commandId==='c04') {
                        result = [idsForTagCPage1, { tagKey,tagValue,commandId: 'c12' }];
                    } else if (exclusiveStart?.commandId==='c12') {
                        result = [idsForTagCPage2, undefined];
                    } 
                    break;
                default:
                    break;
            }
            return Promise.resolve(result);
        });

        // execute
        const [ids,pagination] = await underTest.listIds({'A':'1','B':'2','C':'3'}, {commandId:'c04'}, 4);

        expect(ids).toBeDefined();
        expect(ids.length).toEqual(4);
        expect(ids[0]).toEqual('c06');
        expect(ids[1]).toEqual('c08');
        expect(ids[2]).toEqual('c10');
        expect(ids[3]).toEqual('c12');
        expect(pagination).toBeDefined();
        expect(pagination.commandId).toEqual('c12');
    });

});
