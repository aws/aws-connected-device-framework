/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import AWS, { AWSError } from 'aws-sdk';

import { DeploymentsDao } from './deployments.dao';
import { GroupsDao } from '../groups/groups.dao';
import { DevicesDao } from '../devices/devices.dao';
import { DeploymentsService } from './deployments.service';
import { DeploymentItem, DeploymentTaskSummary } from './deployments.models';
import { GroupItem } from '../groups/groups.models';

describe('DeploymentsService', () => {
    const region='';
    const bulkDeploymentExecutionRoleArn='';
    const bulkDeploymentsBucket='';
    const bulkDeploymentsPrefix='';
    const deploymentsQueue='';
    const bulkDeploymentsStatusQueue='';

    let mockedDeploymentsDao: jest.Mocked<DeploymentsDao>;
    let mockedGroupsDao: jest.Mocked<GroupsDao>;
    let mockedDevicesDao: jest.Mocked<DevicesDao>;
    let mockedGreengrass: AWS.Greengrass;
    let mockedS3: AWS.S3;
    let mockedSQS: AWS.SQS;

    let instance: DeploymentsService;

    beforeEach(() => {
        mockedDeploymentsDao = createMockInstance(DeploymentsDao);
        mockedGroupsDao = createMockInstance(GroupsDao);
        mockedDevicesDao = createMockInstance(DevicesDao);
        mockedGreengrass = new AWS.Greengrass();
        mockedS3 = new AWS.S3();
        mockedSQS = new AWS.SQS();

        const mockedGreengrassFactory = () => {
            return mockedGreengrass;
        };
        const mockedS3Factory = () => {
            return mockedS3;
        };
        const mockedSQSFactory = () => {
            return mockedSQS;
        };

        instance = new DeploymentsService(region, bulkDeploymentExecutionRoleArn, bulkDeploymentsBucket, bulkDeploymentsPrefix,
            deploymentsQueue, bulkDeploymentsStatusQueue, mockedDeploymentsDao, mockedGroupsDao,
            mockedDevicesDao, mockedGreengrassFactory, mockedS3Factory, mockedSQSFactory);
    });

    it('createDeploymentTask: happy path', async() => {

        // stubs
        const input:DeploymentItem[] = [{
            groupName: 'group1',
            deploymentType: 'NewDeployment'
        },{
            groupName: 'group2',
            deploymentType: 'Redeployment'
        },{
            groupName: 'group3',
            deploymentType: 'ResetDeployment'
        },{
            groupName: 'group4',
            deploymentType: 'ForceResetDeployment'
        }];

        // mocks
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();

        const mockSendMessageResponse = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResponse.response = {};
        const mockSendMessage = mockedSQS.sendMessage = <any>(jest.fn((_params) => mockSendMessageResponse));

        // execute
        const actual = await instance.createDeploymentTask(input);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.taskId).not.toBeNull();
        expect(actual.taskStatus).toEqual('Waiting');
        expect(actual.createdAt).not.toBeNull();
        expect(actual.updatedAt).not.toBeNull();
        expect(actual.deployments?.length).toEqual(input.length);

        // verify the right data is to be saved
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls[0][0]).toEqual(actual);

        // verify the right format message is sent to sqs
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual(deploymentsQueue);
        expect(sendMessageArgs.MessageBody).toEqual(JSON.stringify({taskId: actual.taskId}));
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual(DeploymentTaskSummary.name);

    });

    it('createDeploymentTask: missing type is defaulted to NewDeployment', async() => {

        // stubs
        const input:DeploymentItem[] = [{
            groupName: 'group1',
            deploymentType: 'NewDeployment'
        },{
            groupName: 'group2',
            deploymentType: 'Redeployment'
        },{
            groupName: 'group3',
            deploymentType: 'ResetDeployment'
        },{
            groupName: 'group4',
            deploymentType: 'ForceResetDeployment'
        },{
            groupName: 'group'
        }];

        // mocks
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();

        const mockSendMessageResponse = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResponse.response = {};
        const mockSendMessage = mockedSQS.sendMessage = <any>(jest.fn((_params) => mockSendMessageResponse));

        // execute
        const actual = await instance.createDeploymentTask(input);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.taskId).not.toBeNull();
        expect(actual.taskStatus).toEqual('Waiting');
        expect(actual.createdAt).not.toBeNull();
        expect(actual.updatedAt).not.toBeNull();
        expect(actual.deployments?.length).toEqual(input.length);
        for(let i=0; i<=input.length-2; i++) {
            expect(actual.deployments[i].deploymentType).toEqual(input[i].deploymentType);
        }
        expect(actual.deployments[input.length-1].deploymentType).toEqual(input[input.length-1].deploymentType);

        // verify the right data is to be saved
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls[0][0]).toEqual(actual);

        // verify the right format message is sent to sqs
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual(deploymentsQueue);
        expect(sendMessageArgs.MessageBody).toEqual(JSON.stringify({taskId: actual.taskId}));
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual(DeploymentTaskSummary.name);

    });

    it('deploy: happy path with new deployments', async() => {

        // stubs
        const taskId = 'task-123';

        const task:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }, {
                groupName: 'group-2',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }]
        };

        const group1:GroupItem = {
            name: 'group-1',
            id: 'group-id-1',
            versionId: 'group-version-id-1',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        const group2:GroupItem = {
            name: 'group-2',
            id: 'group-id-2',
            versionId: 'group-version-id-2',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        // set up mocks
        // called from the main method
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(task);
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(group2);

        // called from the private isBulkDeploymentsRunning() method...
        const mockListBulkDeploymentsResponse = new MockAWSPromise<AWS.Greengrass.ListBulkDeploymentsResponse>();
        mockListBulkDeploymentsResponse.response = {
            BulkDeployments: []
        };
        const mockListBulkDeployments = mockedGreengrass.listBulkDeployments = <any>(jest.fn((_params) => mockListBulkDeploymentsResponse));

        // called from the private createBulkDeploymentTask() method...
        const mockPutObjectOutput = new MockAWSPromise<AWS.S3.PutObjectOutput>();
        mockPutObjectOutput.response = {};
        const mockPutObject = mockedS3.putObject = <any>(jest.fn((_params) => mockPutObjectOutput));

        const mockStartBulkDeploymentResponse = new MockAWSPromise<AWS.Greengrass.StartBulkDeploymentResponse>();
        mockStartBulkDeploymentResponse.response = {
            BulkDeploymentArn: 'bulk-deployment-arn-1',
            BulkDeploymentId: 'bulk-deployment-id-1'
        };
        const mockStartBulkDeployment = mockedGreengrass.startBulkDeployment = <any>(jest.fn((_params) => mockStartBulkDeploymentResponse));

        // called from the private publishBulkDeploymentStatusCheck() method...
        const mockSendMessageResult = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResult.response = {};
        const mockSendMessage = mockedSQS.sendMessage = <any>(jest.fn((_params) => mockSendMessageResult));

        // called from the private determineDevicesToDeploy() method...
        mockedDevicesDao.listDevices = jest.fn().mockImplementationOnce(()=> []);

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(true);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockListBulkDeployments.mock.calls.length).toBe(1);
        expect(mockPutObject.mock.calls.length).toBe(1);
        expect(mockStartBulkDeployment.mock.calls.length).toBe(1);
        expect(mockSendMessage.mock.calls.length).toBe(1);
        expect(mockedDevicesDao.listDevices.mock.calls.length).toBe(2);

        // verify the deployment was locked by setting its status
        // NOTE: due to limitations with Jest storing method args by reference instead of value, it
        //       is not possibleto write this test as the task status is mutated during the call :(
        // const expectedFirstSaveDeploymentTaskArgs:DeploymentTaskSummary = { ...task, taskStatus: 'InProgress' };
        // expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedFirstSaveDeploymentTaskArgs);

        // verify the bulk deployment task data was created successfully
        const putObjectArgs: AWS.S3.PutObjectRequest = mockPutObject.mock.calls[0][0];
        expect(putObjectArgs.Bucket).toEqual(bulkDeploymentsBucket);
        const s3Key = `${bulkDeploymentsPrefix}${taskId}.json`;
        expect(putObjectArgs.Key).toEqual(s3Key);
        expect(putObjectArgs.Body).toEqual('{"GroupId":"group-id-1", "GroupVersionId":"group-version-id-1", "DeploymentType":"NewDeployment"}\n{"GroupId":"group-id-2", "GroupVersionId":"group-version-id-2", "DeploymentType":"NewDeployment"}\n');

        // verify the bulk deployment task was created successfully
        const s3Uri = `https://${bulkDeploymentsBucket}.s3-${region}.amazonaws.com/${s3Key}`;
        const startBulkDeploymentArgs: AWS.Greengrass.StartBulkDeploymentRequest = mockStartBulkDeployment.mock.calls[0][0];
        expect(startBulkDeploymentArgs.InputFileUri).toEqual(s3Uri);
        expect(startBulkDeploymentArgs.ExecutionRoleArn).toEqual(bulkDeploymentExecutionRoleArn);
        expect(startBulkDeploymentArgs.AmznClientToken).toEqual(taskId);

        // verify the deployment was saved with all the new data
        const expectedSecondSaveDeploymentTaskArgs:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Success',
            bulkDeploymentId: 'bulk-deployment-id-1',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'NewDeployment',
                groupId: 'group-id-1',
                groupVersionId: 'group-version-id-1',
                bulkDeploymentId: 'bulk-deployment-id-1',
                deploymentStatus: 'InProgress',
            }, {
                groupName: 'group-2',
                deploymentType: 'NewDeployment',
                groupId: 'group-id-2',
                groupVersionId: 'group-version-id-2',
                bulkDeploymentId: 'bulk-deployment-id-1',
                deploymentStatus: 'InProgress',
            }]
        };
        expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedSecondSaveDeploymentTaskArgs);

        // verify that we've sent an sqs message to check the bulk provison status
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual(bulkDeploymentsStatusQueue);
        expect(sendMessageArgs.MessageBody).toEqual(JSON.stringify({taskId}));
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual('BulkDeploymentStatus');

    });

    it('deploy: happy path with redeployments', async() => {

        // stubs
        const taskId = 'task-123';

        const task:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'Redeployment',
                deploymentStatus: 'Waiting',
                deploymentId: 'deployment-id-1',
            }, {
                groupName: 'group-2',
                deploymentType: 'Redeployment',
                deploymentStatus: 'Waiting',
                deploymentId: 'deployment-id-2',
            }]
        };

        const group1:GroupItem = {
            name: 'group-1',
            id: 'group-id-1',
            versionId: 'group-version-id-1',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        const group2:GroupItem = {
            name: 'group-2',
            id: 'group-id-2',
            versionId: 'group-version-id-2',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        // set up mocks
        // called from the main method
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(task);
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(group2);

        const mockCreateDeploymentResponse1 = new MockAWSPromise<AWS.Greengrass.CreateDeploymentResponse>();
        mockCreateDeploymentResponse1.response = {DeploymentId: 'deployment-id-1'};
        const mockCreateDeploymentResponse2 = new MockAWSPromise<AWS.Greengrass.CreateDeploymentResponse>();
        mockCreateDeploymentResponse2.response = {DeploymentId: 'deployment-id-2'};
        const mockCreateDeployment = mockedGreengrass.createDeployment = <any>(jest.fn()
            .mockReturnValueOnce(mockCreateDeploymentResponse1)
            .mockReturnValueOnce(mockCreateDeploymentResponse2));

        // called from the private determineDevicesToDeploy() method...
        mockedDevicesDao.listDevices = jest.fn().mockImplementationOnce(()=> []);

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(true);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockCreateDeployment.mock.calls.length).toBe(2);
        expect(mockedDevicesDao.listDevices.mock.calls.length).toBe(2);

        // verify the deployment was locked by setting its status
        // NOTE: due to limitations with Jest storing method args by reference instead of value, it
        //       is not possibleto write this test as the task status is mutated during the call :(
        // const expectedFirstSaveDeploymentTaskArgs:DeploymentTaskSummary = { ...task, taskStatus: 'InProgress' };
        // expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedFirstSaveDeploymentTaskArgs);

        // verify the deployments were created successfully
        const createDeployment1Args: AWS.Greengrass.CreateDeploymentRequest = mockCreateDeployment.mock.calls[0][0];
        expect(createDeployment1Args.DeploymentType).toEqual('Redeployment');
        expect(createDeployment1Args.GroupId).toEqual(`${group1.id}`);
        expect(createDeployment1Args.AmznClientToken).toEqual(`${taskId}-${group1.name}`);
        expect(createDeployment1Args.GroupVersionId).toEqual(`${group1.versionId}`);
        expect(createDeployment1Args.DeploymentId).toEqual(`${task.deployments[0].deploymentId}`);

        const createDeployment2Args: AWS.Greengrass.CreateDeploymentRequest = mockCreateDeployment.mock.calls[1][0];
        expect(createDeployment2Args.DeploymentType).toEqual('Redeployment');
        expect(createDeployment2Args.GroupId).toEqual(`${group2.id}`);
        expect(createDeployment2Args.AmznClientToken).toEqual(`${taskId}-${group2.name}`);
        expect(createDeployment2Args.GroupVersionId).toEqual(`${group2.versionId}`);
        expect(createDeployment2Args.DeploymentId).toEqual(`${task.deployments[1].deploymentId}`);

        // verify the deployment was saved with all the new data
        const expectedSecondSaveDeploymentTaskArgs:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Success',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'Redeployment',
                groupId: 'group-id-1',
                groupVersionId: 'group-version-id-1',
                deploymentId: 'deployment-id-1',
                deploymentStatus: 'InProgress',
            }, {
                groupName: 'group-2',
                deploymentType: 'Redeployment',
                groupId: 'group-id-2',
                groupVersionId: 'group-version-id-2',
                deploymentId: 'deployment-id-2',
                deploymentStatus: 'InProgress',
            }]
        };
        expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedSecondSaveDeploymentTaskArgs);

    });

    it('deploy: happy path with reset deployments', async() => {

        // stubs
        const taskId = 'task-123';

        const task:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'ResetDeployment',
                deploymentStatus: 'Waiting',
                deploymentId: 'deployment-id-1',
            }, {
                groupName: 'group-2',
                deploymentType: 'ForceResetDeployment',
                deploymentStatus: 'Waiting',
                deploymentId: 'deployment-id-2',
            }]
        };

        const group1:GroupItem = {
            name: 'group-1',
            id: 'group-id-1',
            versionId: 'group-version-id-1',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        const group2:GroupItem = {
            name: 'group-2',
            id: 'group-id-2',
            versionId: 'group-version-id-2',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        // set up mocks
        // called from the main method
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(task);
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(group2);

        const mockResetDeploymentsResponse1 = new MockAWSPromise<AWS.Greengrass.ResetDeploymentsResponse>();
        mockResetDeploymentsResponse1.response = {DeploymentId: 'deployment-id-1'};
        const mockResetDeploymentsResponse2 = new MockAWSPromise<AWS.Greengrass.ResetDeploymentsResponse>();
        mockResetDeploymentsResponse2.response = {DeploymentId: 'deployment-id-2'};
        const mockResetDeployments = mockedGreengrass.resetDeployments = <any>(jest.fn()
            .mockReturnValueOnce(mockResetDeploymentsResponse1)
            .mockReturnValueOnce(mockResetDeploymentsResponse2));

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(true);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockResetDeployments.mock.calls.length).toBe(2);

        // verify the deployment was locked by setting its status
        // NOTE: due to limitations with Jest storing method args by reference instead of value, it
        //       is not possibleto write this test as the task status is mutated during the call :(
        // const expectedFirstSaveDeploymentTaskArgs:DeploymentTaskSummary = { ...task, taskStatus: 'InProgress' };
        // expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedFirstSaveDeploymentTaskArgs);

        // verify the deployments were created successfully
        const resetDeployment1Args: AWS.Greengrass.ResetDeploymentsRequest = mockResetDeployments.mock.calls[0][0];
        expect(resetDeployment1Args.GroupId).toEqual(`${group1.id}`);
        expect(resetDeployment1Args.AmznClientToken).toEqual(`${taskId}-${group1.name}`);

        const resetDeployment2Args: AWS.Greengrass.ResetDeploymentsRequest = mockResetDeployments.mock.calls[1][0];
        expect(resetDeployment2Args.GroupId).toEqual(`${group2.id}`);
        expect(resetDeployment2Args.AmznClientToken).toEqual(`${taskId}-${group2.name}`);

        // verify the deployment was saved with all the new data
        const expectedSecondSaveDeploymentTaskArgs:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Success',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'ResetDeployment',
                groupId: 'group-id-1',
                groupVersionId: 'group-version-id-1',
                deploymentId: 'deployment-id-1',
                deploymentStatus: 'InProgress',
            }, {
                groupName: 'group-2',
                deploymentType: 'ForceResetDeployment',
                groupId: 'group-id-2',
                groupVersionId: 'group-version-id-2',
                deploymentId: 'deployment-id-2',
                deploymentStatus: 'InProgress',
            }]
        };
        expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedSecondSaveDeploymentTaskArgs);

    });

    it('deploy: cancelled if new deployments and a bulk provision task is already running', async() => {

        // stubs
        const taskId = 'task-123';

        const task:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }, {
                groupName: 'group-2',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }]
        };

        const group1:GroupItem = {
            name: 'group-1',
            id: 'group-id-1',
            versionId: 'group-version-id-1',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        const group2:GroupItem = {
            name: 'group-2',
            id: 'group-id-2',
            versionId: 'group-version-id-2',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        // set up mocks
        // called from the main method
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(task);
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(group2);

        // called from the private isBulkDeploymentsRunning() method...
        const mockListBulkDeploymentsResponse = new MockAWSPromise<AWS.Greengrass.ListBulkDeploymentsResponse>();
        mockListBulkDeploymentsResponse.response = {
            BulkDeployments: [{BulkDeploymentId: 'bulk-deployment-id-1'}]
        };
        const mockListBulkDeployments = mockedGreengrass.listBulkDeployments = <any>(jest.fn((_params) => mockListBulkDeploymentsResponse));

        const mockGetBulkDeploymentStatusResponse = new MockAWSPromise<AWS.Greengrass.GetBulkDeploymentStatusResponse>();
        mockGetBulkDeploymentStatusResponse.response = {
            BulkDeploymentStatus: 'Running'
        };
        const mockGetBulkDeploymentStatus = mockedGreengrass.getBulkDeploymentStatus = <any>(jest.fn((_params) => mockGetBulkDeploymentStatusResponse));

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(false);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockListBulkDeployments.mock.calls.length).toBe(1);
        expect(mockGetBulkDeploymentStatus.mock.calls.length).toBe(1);

        // verify the deployment was locked by setting its status
        // NOTE: due to limitations with Jest storing method args by reference instead of value, it
        //       is not possibleto write this test as the task status is mutated during the call :(
        // const expectedFirstSaveDeploymentTaskArgs:DeploymentTaskSummary = { ...task, taskStatus: 'InProgress' };
        // expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedFirstSaveDeploymentTaskArgs);

        // verify the deployment was saved with all the new data
        expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(task);

    });

    it('deploy: marked as failed if something goes wrong', async() => {

        // stubs
        const taskId = 'task-123';

        const task:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }, {
                groupName: 'group-2',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Waiting',
            }]
        };

        const group1:GroupItem = {
            name: 'group-1',
            id: 'group-id-1',
            versionId: 'group-version-id-1',
            templateName: 'template-1',
            versionNo: 1,
            deployed: false
        };

        // set up mocks
        // called from the main method
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(task);
        mockedDeploymentsDao.saveDeploymentTask = jest.fn();
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(undefined);    // we're simulating group-2 not existing which should cause the task to be marked as failed

        // called from the private isBulkDeploymentsRunning() method...
        const mockListBulkDeploymentsResponse = new MockAWSPromise<AWS.Greengrass.ListBulkDeploymentsResponse>();
        mockListBulkDeploymentsResponse.response = {
            BulkDeployments: []
        };
        const mockListBulkDeployments = mockedGreengrass.listBulkDeployments = <any>(jest.fn((_params) => mockListBulkDeploymentsResponse));

        // called from the private createBulkDeploymentTask() method...
        const mockPutObjectOutput = new MockAWSPromise<AWS.S3.PutObjectOutput>();
        mockPutObjectOutput.response = {};
        const mockPutObject = mockedS3.putObject = <any>(jest.fn((_params) => mockPutObjectOutput));

        const mockStartBulkDeploymentResponse = new MockAWSPromise<AWS.Greengrass.StartBulkDeploymentResponse>();
        mockStartBulkDeploymentResponse.response = {
            BulkDeploymentArn: 'bulk-deployment-arn-1',
            BulkDeploymentId: 'bulk-deployment-id-1'
        };
        const mockStartBulkDeployment = mockedGreengrass.startBulkDeployment = <any>(jest.fn((_params) => mockStartBulkDeploymentResponse));

        // called from the private publishBulkDeploymentStatusCheck() method...
        const mockSendMessageResult = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResult.response = {};
        const mockSendMessage = mockedSQS.sendMessage = <any>(jest.fn((_params) => mockSendMessageResult));

        // called from the private determineDevicesToDeploy() method...
        mockedDevicesDao.listDevices = jest.fn().mockImplementationOnce(()=> []);

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(true);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);
        expect(mockedDeploymentsDao.saveDeploymentTask.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockListBulkDeployments.mock.calls.length).toBe(1);
        expect(mockPutObject.mock.calls.length).toBe(1);
        expect(mockStartBulkDeployment.mock.calls.length).toBe(1);
        expect(mockSendMessage.mock.calls.length).toBe(1);
        expect(mockedDevicesDao.listDevices.mock.calls.length).toBe(1);

        // verify the deployment was locked by setting its status
        // NOTE: due to limitations with Jest storing method args by reference instead of value, it
        //       is not possibleto write this test as the task status is mutated during the call :(
        // const expectedFirstSaveDeploymentTaskArgs:DeploymentTaskSummary = { ...task, taskStatus: 'InProgress' };
        // expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedFirstSaveDeploymentTaskArgs);

        // verify the bulk deployment task data was created successfully (should just contain 1 group)
        const putObjectArgs: AWS.S3.PutObjectRequest = mockPutObject.mock.calls[0][0];
        expect(putObjectArgs.Bucket).toEqual(bulkDeploymentsBucket);
        const s3Key = `${bulkDeploymentsPrefix}${taskId}.json`;
        expect(putObjectArgs.Key).toEqual(s3Key);
        expect(putObjectArgs.Body).toEqual('{"GroupId":"group-id-1", "GroupVersionId":"group-version-id-1", "DeploymentType":"NewDeployment"}\n');

        // verify the bulk deployment task was created successfully
        const s3Uri = `https://${bulkDeploymentsBucket}.s3-${region}.amazonaws.com/${s3Key}`;
        const startBulkDeploymentArgs: AWS.Greengrass.StartBulkDeploymentRequest = mockStartBulkDeployment.mock.calls[0][0];
        expect(startBulkDeploymentArgs.InputFileUri).toEqual(s3Uri);
        expect(startBulkDeploymentArgs.ExecutionRoleArn).toEqual(bulkDeploymentExecutionRoleArn);
        expect(startBulkDeploymentArgs.AmznClientToken).toEqual(taskId);

        // verify the deployment was saved with all the new data
        const expectedSecondSaveDeploymentTaskArgs:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Failure',
            bulkDeploymentId: 'bulk-deployment-id-1',
            deployments: [{
                groupName: 'group-1',
                deploymentType: 'NewDeployment',
                groupId: 'group-id-1',
                groupVersionId: 'group-version-id-1',
                bulkDeploymentId: 'bulk-deployment-id-1',
                deploymentStatus: 'InProgress',
            }, {
                groupName: 'group-2',
                deploymentType: 'NewDeployment',
                deploymentStatus: 'Failure',
                statusMessage: 'Not a known Greengrass group',
            }]
        };
        expect( mockedDeploymentsDao.saveDeploymentTask.mock.calls[1][0]).toEqual(expectedSecondSaveDeploymentTaskArgs);

        // verify that we've sent an sqs message to check the bulk provison status
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual(bulkDeploymentsStatusQueue);
        expect(sendMessageArgs.MessageBody).toEqual(JSON.stringify({taskId}));
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual('BulkDeploymentStatus');

    });

    it('deploy: unknown task is not run', async() => {

        // stubs
        const taskId = 'task-unknown';

        // set up mocks
        mockedDeploymentsDao.getDeploymentTask = jest.fn().mockReturnValueOnce(undefined);

        // execute the test
        const actual = await instance.deploy(taskId);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual).toEqual(true);

        // verify everything was called the expected no. of times
        expect(mockedDeploymentsDao.getDeploymentTask.mock.calls.length).toBe(1);

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
