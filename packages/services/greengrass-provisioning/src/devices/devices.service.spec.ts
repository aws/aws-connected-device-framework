/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import AWS, { AWSError } from 'aws-sdk';

import { DevicesDao } from './devices.dao';
import { GroupsDao } from '../groups/groups.dao';
import { GreengrassUtils } from '../utils/greengrass.util';
import { DevicesService } from './devices.service';
import {DeviceItem, DeviceTaskItem, DeviceTaskSummary} from './devices.models';
import { GroupItem } from '../groups/groups.models';
import {CreateGroupVersionHandler} from './handlers/createGroupVersion.handler';
import {ExistingAssociationHandler} from './handlers/existingAssociation.handler';
import {GetPrincipalHandler} from './handlers/getPrincipal.handler';
import {GetThingHandler} from './handlers/getThing.handler';
import {ProvisionThingHandler} from './handlers/provisonThing.handler';
import {SaveGroupHandler} from './handlers/saveGroup.handler';
import {CoreConfigHandler} from './handlers/coreConfig.handler';

describe('DevicesService', () => {
    const deviceAssociationQueue = 'device_association_queue';

    let mockedDevicesDao: jest.Mocked<DevicesDao>;
    let mockedGroupsDao: jest.Mocked<GroupsDao>;
    let mockedGreengrassUtils: jest.Mocked<GreengrassUtils>;

    let mockedCreateGroupVersionHandler: CreateGroupVersionHandler;
    let mockedExistingAssociationHandler: ExistingAssociationHandler;
    let mockedGetPrincipalHandler: GetPrincipalHandler;
    let mockedGetThingHandler1: GetThingHandler;
    let mockedGetThingHandler2: GetThingHandler;
    let mockedCoreConfigHandler: CoreConfigHandler;
    let mockedProvisionThingHandler: ProvisionThingHandler;
    let mockedSaveGroupHandler: SaveGroupHandler;

    let mockedSQS: AWS.SQS;

    let instance: DevicesService;

    beforeEach(() => {
        mockedDevicesDao = createMockInstance(DevicesDao);
        mockedGroupsDao = createMockInstance(GroupsDao);
        mockedGreengrassUtils = createMockInstance(GreengrassUtils);

        // testing the chains handlers is tricky.  we want the chain to use its implemented logic, yet
        // we should mock the handle method.  therefore we spyon real implementations and override just
        // the handler method rather than creating a mock instance as usual.
        mockedGetThingHandler1 = new GetThingHandler(()=>undefined);
        mockedExistingAssociationHandler = new ExistingAssociationHandler(undefined, undefined);
        mockedProvisionThingHandler = new ProvisionThingHandler(undefined,undefined,undefined,undefined);
        mockedGetThingHandler2 = new GetThingHandler(()=>undefined);
        mockedCoreConfigHandler = new CoreConfigHandler(undefined, undefined, undefined, undefined, undefined);
        mockedGetPrincipalHandler = new GetPrincipalHandler(()=>undefined);
        mockedCreateGroupVersionHandler = new CreateGroupVersionHandler(undefined,undefined);
        mockedSaveGroupHandler = new SaveGroupHandler(undefined,undefined);

        mockedSQS = new AWS.SQS();
        const mockedSQSFactory = () => {
            return mockedSQS;
        };

        instance = new DevicesService(deviceAssociationQueue,mockedDevicesDao, mockedGroupsDao, mockedGreengrassUtils,
            mockedCreateGroupVersionHandler, mockedExistingAssociationHandler, mockedGetPrincipalHandler, mockedGetThingHandler1,
            mockedGetThingHandler2, mockedCoreConfigHandler, mockedProvisionThingHandler, mockedSaveGroupHandler, mockedSQSFactory);
    });

    it('createDeviceAssociationTask: happy path', async() => {

        // stubs
        const groupName = 'group-1';
        const items:DeviceItem[] = [{
            thingName: 'thing-1',
            type: 'core',
            provisioningTemplate: 'template-1',
        },{
            thingName: 'thing-2',
            type: 'device',
            provisioningTemplate: 'template-2',
        }];

        const group:GroupItem = {
            name: 'group-1',
            id: 'group-id-1;',
            templateName: 'template-1',
        };

        // mocks
        mockedGroupsDao.get = jest.fn().mockReturnValueOnce(group);

        const mockGetGroupResponse = new MockAWSPromise<AWS.Greengrass.GetGroupResponse>();
        mockGetGroupResponse.response = {};
        const mockGetGroup = mockedGreengrassUtils.getGroupInfo = <any> jest.fn((_params) => mockGetGroupResponse);

        mockedDevicesDao.saveDeviceAssociationTask= jest.fn();

        const mockSendMessageResponse = new MockAWSPromise<AWS.SQS.SendMessageResult>();
        mockSendMessageResponse.response = {};
        const mockSendMessage = mockedSQS.sendMessage = <any>(jest.fn((_params) => mockSendMessageResponse));

        // execute
        const actual = await instance.createDeviceAssociationTask(groupName, items);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.taskId).toBeDefined();
        expect(actual.groupName).toBe(groupName);
        expect(actual.status).toEqual('Waiting');
        expect(actual.createdAt).toBeDefined();
        expect(actual.updatedAt).toBeDefined();
        expect(actual.devices?.length).toEqual(items.length);
        expect(actual.devices).toContainEqual(<DeviceTaskItem> {
            ...items[0],
            status: 'Waiting',
        });
        expect(actual.devices).toContainEqual(<DeviceTaskItem> {
            ...items[1],
            status: 'Waiting',
        });

        // verify everything was called the expected no. of times
        expect(mockedGroupsDao.get.mock.calls.length).toBe(1);
        expect(mockGetGroup.mock.calls.length).toBe(1);
        expect(mockedDevicesDao.saveDeviceAssociationTask.mock.calls.length).toBe(1);
        expect(mockSendMessage.mock.calls.length).toBe(1);

        // verify the right data is to be saved
        expect(mockedDevicesDao.saveDeviceAssociationTask.mock.calls[0][0]).toEqual(actual);

        // verify the right format message is sent to sqs
        const sendMessageArgs: AWS.SQS.SendMessageRequest = mockSendMessage.mock.calls[0][0];
        expect(sendMessageArgs).toBeDefined();
        expect(sendMessageArgs.QueueUrl).toEqual(deviceAssociationQueue);
        expect(sendMessageArgs.MessageBody).toEqual(JSON.stringify(actual));
        expect(sendMessageArgs.MessageAttributes.messageType.StringValue).toEqual('DeviceTaskSummary');

    });

    it('createDeviceAssociationTask: group item does not exist', async() => {

        // stubs
        const groupName = 'group-1';
        const items:DeviceItem[] = [{
            thingName: 'thing-1',
            type: 'core',
            provisioningTemplate: 'template-1',
        },{
            thingName: 'thing-2',
            type: 'device',
            provisioningTemplate: 'template-2',
        }];

        // mocks
        mockedGroupsDao.get = jest.fn().mockReturnValueOnce(undefined);

        // execute
        try {
            await instance.createDeviceAssociationTask(groupName, items);
            fail('NOT_FOUND should be thrown');
        } catch (err) {
            expect(err.message).toBe('NOT_FOUND');
        }

    });

    it('associateDevicesWithGroup: happy path', async() => {

        // stubs
        const input:DeviceTaskSummary = {
            taskId: 'task-123',
            groupName: 'group-1',
            devices: [{
                thingName: 'thing-1',
                type: 'core',
                provisioningTemplate: 'template-1',
                status: 'Waiting',
            },{
                thingName: 'thing-2',
                type: 'device',
                provisioningTemplate: 'template-2',
                status: 'Waiting',
            }],
            status: 'Waiting'
        };

        // mock service calls
        mockedGroupsDao.get = jest.fn().mockReturnValueOnce(<GroupItem>{
            name: input.groupName,
            id: 'group-id-1',
            templateName: 'template-1',
        });
        mockedGreengrassUtils.getGroupInfo = jest.fn().mockReturnValueOnce(<AWS.Greengrass.GetGroupResponse>{
            Id: 'group-id-1',
            LatestVersion: 'group-version-id-1'
        });
        mockedGreengrassUtils.getGroupVersionInfo = jest.fn().mockReturnValueOnce(<AWS.Greengrass.GetGroupVersionResponse>{
            CoreDefinitionVersionArn: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/cores/core-def-1/versions/core-def-version-1',
            DeviceDefinitionVersionArn: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/devices/device-def-1/versions/device-def-version-1'
        });
        mockedGreengrassUtils.getCoreInfo = jest.fn().mockReturnValueOnce(<AWS.Greengrass.CoreDefinitionVersion>{
            Cores: []
        });
        mockedGreengrassUtils.getDeviceInfo = jest.fn().mockReturnValueOnce(<AWS.Greengrass.DeviceDefinitionVersion>{
            Devices: []
        });

        // spy on the handlers to override their implementation
        // @ts-ignore
        const spiedCreateGroupVersionHandlerHandle = jest.spyOn(mockedCreateGroupVersionHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedExistingAssociationHandlerHandle = jest.spyOn(mockedExistingAssociationHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedGetPrincipalHandlerHandle = jest.spyOn(mockedGetPrincipalHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedGetThingHandler1Handle = jest.spyOn(mockedGetThingHandler1, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedGetThingHandler2Handle = jest.spyOn(mockedGetThingHandler2, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedCoreThingHandlerHandle = jest.spyOn(mockedCoreConfigHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedProvisionThingHandlerHandle = jest.spyOn(mockedProvisionThingHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));
        // @ts-ignore
        const spiedSaveGroupHandlerHandle = jest.spyOn(mockedSaveGroupHandler, 'handle').mockImplementationOnce((params)=> Promise.resolve(params));

        // execute
        await instance.associateDevicesWithGroup(input);

        // verify everything was called the expected no. of times
        expect(mockedGroupsDao.get.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.getGroupInfo.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.getGroupVersionInfo.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.getCoreInfo.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.getDeviceInfo.mock.calls.length).toBe(1);

        // TODO! figure out a way to test the chain setup without needing to replicate the chain as a mocked implementation
        // expect(spiedGetThingHandler1Handle.mock.calls.length).toBe(1);
        // expect(spiedExistingAssociationHandlerHandle.mock.calls.length).toBe(1);
        // expect(spiedProvisionThingHandlerHandle.mock.calls.length).toBe(1);
        // expect(spiedGetThingHandler2Handle.mock.calls.length).toBe(1);
        // expect(spiedGetPrincipalHandlerHandle.mock.calls.length).toBe(1);
        // expect(spiedCreateGroupVersionHandlerHandle.mock.calls.length).toBe(1);
        // expect(spiedSaveGroupHandlerHandle.mock.calls.length).toBe(1);

        // verify the items were provisioned as expected
        expect(mockedGroupsDao.get.mock.calls[0][0]).toEqual('group-1');
        expect(mockedGreengrassUtils.getGroupInfo.mock.calls[0][0]).toEqual('group-id-1');
        expect(mockedGreengrassUtils.getGroupVersionInfo.mock.calls[0][0]).toEqual('group-id-1');
        expect(mockedGreengrassUtils.getGroupVersionInfo.mock.calls[0][1]).toEqual('group-version-id-1');
        expect(mockedGreengrassUtils.getCoreInfo.mock.calls[0][0]).toEqual('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/cores/core-def-1/versions/core-def-version-1');
        expect(mockedGreengrassUtils.getDeviceInfo.mock.calls[0][0]).toEqual('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/devices/device-def-1/versions/device-def-version-1');

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
