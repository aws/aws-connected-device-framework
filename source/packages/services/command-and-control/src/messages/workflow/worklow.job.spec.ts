import 'reflect-metadata';

import AWS, { Iot } from 'aws-sdk';
import { createMockInstance } from 'jest-create-mock-instance';
import { CommandItem } from '../../commands/commands.models';
import { MessagesDao } from '../messages.dao';
import { MessageItem } from '../messages.models';
import { JobAction } from './workflow.job';

describe('Workflow.Job', () => {
    let mockedIot: Iot;
    let underTest: JobAction;
    let mockedIotFactory: () => AWS.Iot;

    let mockedMessagesDao: MessagesDao;

    beforeEach(() => {
        mockedIot = new Iot();
        mockedMessagesDao = createMockInstance(MessagesDao);
        mockedIotFactory = () => {
            return mockedIot;
        };
        mockedIot.createJob = jest.fn();

        underTest = new JobAction(
            '1234',
            'us-west-2',
            'fakeArnRole',
            mockedMessagesDao,
            mockedIotFactory
        );
    });

    const message: MessageItem = {
        commandId: '1111',
        resolvedTargets: [
            { id: 'thing1', type: 'thing', status: 'pending' },
            { id: 'thing2', type: 'thing', status: 'pending' },
        ],
    };

    const command: CommandItem = {
        operation: 'RunTests',
        deliveryMethod: {
            type: 'JOB',
            targetSelection: 'CONTINUOUS',
            expectReply: true,
        },
    };

    it('should resolve thing names as targetArns', async () => {
        await underTest.process(message, command);
        expect(mockedIot.createJob).toBeCalledTimes(1);
        const createJobRequest = (mockedIot.createJob as jest.Mock).mock
            .calls[0][0] as Iot.CreateJobRequest;
        expect(createJobRequest.targets.length).toBe(2);
    });

    it('should handle both things and groups in resolved target list', async () => {
        const message: MessageItem = {
            commandId: '1111',
            resolvedTargets: [
                { id: 'thing1', type: 'thing', status: 'pending' },
                { id: 'thing2', type: 'thing', status: 'pending' },
                { id: 'group1', type: 'thingGroup', status: 'pending' },
            ],
        };

        underTest = new JobAction(
            '1234',
            'us-west-2',
            'fakeArnRole',
            mockedMessagesDao,
            mockedIotFactory
        );
        await underTest.process(message, command);
        expect(mockedIot.createJob).toBeCalledTimes(1);
        const createJobRequest = (mockedIot.createJob as jest.Mock).mock
            .calls[0][0] as Iot.CreateJobRequest;
        expect(createJobRequest.targets.length).toBe(3);
        expect(createJobRequest.targets[0]).toBe('arn:aws:iot:us-west-2:1234:thing/thing1');
        expect(createJobRequest.targets[1]).toBe('arn:aws:iot:us-west-2:1234:thing/thing2');
        expect(createJobRequest.targets[2]).toBe('arn:aws:iot:us-west-2:1234:thinggroup/group1');
    });
});
