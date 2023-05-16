import 'reflect-metadata';
import { Iot } from 'aws-sdk';
import { CommandItem } from '../../commands/commands.models';
import { MessageItem } from '../messages.models';
import { JobAction } from './workflow.job';
import createMockInstance from 'jest-create-mock-instance';
import { ThingsLambdaService } from '@aws-solutions/cdf-provisioning-client/src/client/things.lambda.service';
import { ThingsService } from '@aws-solutions/cdf-provisioning-client';

describe('Workflow.Job', () => {
    let mockedIot: Iot;
    let underTest: JobAction;
    let mockedIotFactory: () => AWS.Iot;
    let mockedThingsService: ThingsService;

    const createdEphemeralGroup = 'sampleGroupArn';

    beforeEach(() => {
        mockedIot = new Iot();
        mockedIotFactory = () => {
            return mockedIot;
        };
        mockedIot.createJob = jest.fn();
        mockedIot.createThingGroup = jest.fn().mockReturnValue({
            promise: () => Promise.resolve({ thingGroupArn: createdEphemeralGroup }),
        });

        mockedThingsService = createMockInstance(ThingsLambdaService);
        mockedThingsService.bulkProvisionThings = jest.fn().mockResolvedValue({ taskId: '222' });
        mockedThingsService.getBulkProvisionTask = jest
            .fn()
            .mockResolvedValue({ taskId: '222', status: 'Completed' });

        underTest = new JobAction(
            '1234',
            5,
            'us-west-2',
            'fakeArnRole',
            mockedThingsService,
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

    it('should create ephmeral groupArn when things exceed maximum target limit', async () => {
        underTest = new JobAction(
            '1234',
            1,
            'us-west-2',
            'fakeArnRole',
            mockedThingsService,
            mockedIotFactory
        );
        await underTest.process(message, command);
        expect(mockedIot.createJob).toBeCalledTimes(1);
        const createJobRequest = (mockedIot.createJob as jest.Mock).mock
            .calls[0][0] as Iot.CreateJobRequest;
        expect(createJobRequest.targets.length).toBe(1);
        expect(createJobRequest.targets[0]).toBe(createdEphemeralGroup);
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
            2,
            'us-west-2',
            'fakeArnRole',
            mockedThingsService,
            mockedIotFactory
        );
        await underTest.process(message, command);
        expect(mockedIot.createJob).toBeCalledTimes(1);
        const createJobRequest = (mockedIot.createJob as jest.Mock).mock
            .calls[0][0] as Iot.CreateJobRequest;
        expect(createJobRequest.targets.length).toBe(2);
        expect(createJobRequest.targets[0]).toBe(createdEphemeralGroup);
        expect(createJobRequest.targets[1]).toBe('arn:aws:iot:us-west-2:1234:thinggroup/group1');
    });
});
