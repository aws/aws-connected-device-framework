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

import { AWSError, Iot, SQS } from 'aws-sdk';
import createMockInstance from 'jest-create-mock-instance';

import { CommandsDao } from '../commands/commands.dao';
import { CommandItem } from '../commands/commands.models';
import { MessagesDao } from './messages.dao';
import { MessageItem, TaskBatchProgress } from './messages.models';
import { MessagesService } from './messages.service';
import { WorkflowFactory } from './workflow/workflow.factory';
import { TopicAction } from './workflow/workflow.topic';

describe('MessagesService', () => {
    let mockedCommandsDao: jest.Mocked<CommandsDao>;
    let mockedMessagesDao: jest.Mocked<MessagesDao>;
    let mockedWorkflowFactory: jest.Mocked<WorkflowFactory>;
    let mockedSQS: SQS;
    let mockedIot: Iot;
    let underTest: MessagesService;

    beforeEach(() => {
        mockedCommandsDao = createMockInstance(CommandsDao);
        mockedMessagesDao = createMockInstance(MessagesDao);
        mockedWorkflowFactory = createMockInstance(WorkflowFactory);
        mockedSQS = new SQS();
        mockedIot = new Iot();

        const mockedSQSFactory = () => {
            return mockedSQS;
        };

        const mockedIotFactory = () => {
            return mockedIot;
        };
        underTest = new MessagesService(
            10,
            'mocked-queue-url',
            mockedCommandsDao,
            mockedMessagesDao,
            mockedWorkflowFactory,
            mockedSQSFactory,
            mockedIotFactory
        );
    });

    it('create - happy path', async () => {
        // stubs
        const command: CommandItem = {
            id: 'c123',
        };

        const message: MessageItem = {
            commandId: command.id,
        };

        // mocks
        mockedCommandsDao.get = jest.fn().mockResolvedValueOnce([command]);
        mockedMessagesDao.saveMessage = jest.fn().mockResolvedValueOnce(undefined);
        const mockSendMessageResponse = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResponse.response = {};
        const mockSendMessage = (mockedSQS.sendMessage = <any>(
            jest.fn((_params) => mockSendMessageResponse)
        ));

        // execute

        await underTest.create(message);

        // verify
        expect(mockedCommandsDao.get).toHaveBeenCalledWith([message.commandId]);

        const saved = mockedMessagesDao.saveMessage.mock.calls[0][0];
        expect(saved).toBeDefined();
        expect(saved.id).toBeDefined();
        expect(saved.status).toBe('identifying_targets');
        expect(saved.createdAt).toBeDefined();

        // verify that we've sent an sqs message to the right queue
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual('mocked-queue-url');
        expect(JSON.parse(sendMessageArgs.MessageBody)?.message?.id).toEqual(saved.id);
        expect(JSON.parse(sendMessageArgs.MessageBody)?.command?.id).toEqual(command.id);
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual(
            'Message::identifying_targets'
        );
    });

    it('create - happy path with payload params', async () => {
        // stubs
        const command: CommandItem = {
            id: 'c123',
            payloadParams: ['foo', 'bar'],
        };

        const message: MessageItem = {
            commandId: command.id,
            payloadParamValues: {
                foo: 'one',
                bar: 'two',
            },
        };

        // mocks
        mockedCommandsDao.get = jest.fn().mockResolvedValueOnce([command]);
        mockedMessagesDao.saveMessage = jest.fn().mockResolvedValueOnce(undefined);
        const mockSendMessageResponse = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResponse.response = {};
        const mockSendMessage = (mockedSQS.sendMessage = <any>(
            jest.fn((_params) => mockSendMessageResponse)
        ));

        // execute

        await underTest.create(message);

        // verify
        expect(mockedCommandsDao.get).toHaveBeenCalledWith([message.commandId]);

        const saved = mockedMessagesDao.saveMessage.mock.calls[0][0];
        expect(saved).toBeDefined();
        expect(saved.id).toBeDefined();
        expect(saved.status).toBe('identifying_targets');
        expect(saved.createdAt).toBeDefined();

        // verify that we've sent an sqs message to the right queue
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual('mocked-queue-url');
        expect(JSON.parse(sendMessageArgs.MessageBody)?.message?.id).toEqual(saved.id);
        expect(JSON.parse(sendMessageArgs.MessageBody)?.command?.id).toEqual(command.id);
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual(
            'Message::identifying_targets'
        );
    });

    it('create - failure path - missing payload params', async () => {
        // stubs
        const command: CommandItem = {
            id: 'c123',
            payloadParams: ['foo', 'bar'],
        };

        const message: MessageItem = {
            commandId: command.id,
            payloadParamValues: {
                foo: 'one',
                // missing payload param `bar`
            },
        };

        // mocks
        mockedCommandsDao.get = jest.fn().mockResolvedValueOnce([command]);
        mockedMessagesDao.saveMessage = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        const functionUnderTest = async () => {
            await underTest.create(message);
        };
        await expect(functionUnderTest()).rejects.toThrow(
            "FAILED_VALIDATION: value for command payload parameter 'bar' not provided"
        );

        // verify
        expect(mockedCommandsDao.get).toHaveBeenCalledWith([message.commandId]);
        expect(mockedMessagesDao.saveMessage).toHaveBeenCalledTimes(0);
    });

    it('processMessage - happy path', async () => {
        // stubs
        const command: CommandItem = {
            id: 'c123',
            deliveryMethod: {
                type: 'TOPIC',
                expectReply: true,
                onlineOnly: true,
            },
        };

        const message: MessageItem = {
            commandId: command.id,
            resolvedTargets: [
                { id: 't1', correlationId: 'c1', status: 'success', type: 'thing' },
                { id: 't2', correlationId: 'c2', status: 'success', type: 'thing' },
                { id: 't3', correlationId: 'c3', status: 'success', type: 'thing' },
            ],
        };

        // mocks
        const mockedAction = createMockInstance(TopicAction);
        mockedAction.process = jest.fn().mockResolvedValueOnce(true);
        mockedWorkflowFactory.getAction = jest.fn().mockReturnValueOnce([mockedAction]);

        mockedMessagesDao.updateMessage = jest.fn().mockResolvedValueOnce(undefined);
        mockedMessagesDao.saveResolvedTargets = jest.fn().mockResolvedValueOnce(undefined);

        const batchProgress: TaskBatchProgress = {
            complete: 1,
            total: 1,
        };
        mockedMessagesDao.incrementBatchesCompleted = jest
            .fn()
            .mockResolvedValueOnce(batchProgress);

        mockedMessagesDao.getMessageById = jest.fn().mockResolvedValueOnce(message);

        mockedMessagesDao.updateMessage = jest.fn().mockResolvedValueOnce(undefined);
        mockedMessagesDao.saveBatchProgress = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        await underTest.processMessage(message, command);

        // verify
        expect(mockedWorkflowFactory.getAction).toHaveBeenCalledTimes(1);
        const getActionArgs = mockedWorkflowFactory.getAction.mock.calls[0];
        expect(getActionArgs[0]).toBe(message);
        expect(getActionArgs[1]).toBe(command);

        expect(mockedAction.process).toHaveBeenCalledTimes(1);

        expect(mockedMessagesDao.getMessageById).toHaveBeenCalledTimes(1);

        expect(mockedMessagesDao.updateMessage).toHaveBeenCalledTimes(2);
        const save1Args = mockedMessagesDao.updateMessage.mock.calls[0];
        expect(save1Args[0]).toBe(message);

        expect(mockedMessagesDao.saveResolvedTargets).toHaveBeenCalledTimes(1);

        const save2Args = mockedMessagesDao.updateMessage.mock.calls[1];
        expect(save2Args[0].status).toBe('awaiting_replies');

        expect(mockedMessagesDao.saveBatchProgress).toHaveBeenCalledTimes(1);
    });

    it('processMessage - failure path', async () => {
        // stubs
        const command: CommandItem = {
            id: 'c123',
            deliveryMethod: {
                type: 'TOPIC',
                expectReply: true,
                onlineOnly: true,
            },
        };

        const message: MessageItem = {
            commandId: command.id,
            resolvedTargets: [
                { id: 't1', correlationId: 'c1', status: 'pending', type: 'thing' },
                { id: 't2', correlationId: 'c2', status: 'pending', type: 'thing' },
                { id: 't3', correlationId: 'c3', status: 'pending', type: 'thing' },
            ],
        };

        // mocks
        const mockedAction = createMockInstance(TopicAction);
        mockedAction.process = jest.fn().mockResolvedValueOnce(false);
        mockedWorkflowFactory.getAction = jest.fn().mockReturnValueOnce([mockedAction]);

        mockedMessagesDao.updateMessage = jest.fn().mockResolvedValueOnce(undefined);
        mockedMessagesDao.saveResolvedTargets = jest.fn().mockResolvedValueOnce(undefined);

        const batchProgress: TaskBatchProgress = {
            complete: 1,
            total: 1,
        };
        mockedMessagesDao.incrementBatchesCompleted = jest
            .fn()
            .mockResolvedValueOnce(batchProgress);

        mockedMessagesDao.getMessageById = jest.fn().mockResolvedValueOnce(message);

        mockedMessagesDao.updateMessage = jest.fn().mockResolvedValueOnce(undefined);
        mockedMessagesDao.saveBatchProgress = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        await underTest.processMessage(message, command);

        // verify
        expect(mockedWorkflowFactory.getAction).toHaveBeenCalledTimes(1);
        const getActionArgs = mockedWorkflowFactory.getAction.mock.calls[0];
        expect(getActionArgs[0]).toBe(message);
        expect(getActionArgs[1]).toBe(command);

        expect(mockedAction.process).toHaveBeenCalledTimes(1);

        expect(mockedMessagesDao.getMessageById).toHaveBeenCalledTimes(1);

        expect(mockedMessagesDao.updateMessage).toHaveBeenCalledTimes(2);
        const save1Args = mockedMessagesDao.updateMessage.mock.calls[0];
        expect(save1Args[0]).toBe(message);

        expect(mockedMessagesDao.saveResolvedTargets).toHaveBeenCalledTimes(1);

        const save2Args = mockedMessagesDao.updateMessage.mock.calls[1];
        expect(save2Args[0].status).toBe('failed');
        expect(save2Args[0].statusMessage).toBe('PROCESS_MESSAGE_FAILED');

        expect(mockedMessagesDao.saveBatchProgress).toHaveBeenCalledTimes(1);
    });
});

class MockAWSPromise<T> {
    public response: T;
    public error: AWSError = null;

    promise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
