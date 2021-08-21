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

import {DeviceAssociationModel} from './models';
import {SaveGroupHandler} from './saveGroup.handler';
import {DevicesDao} from '../devices.dao';
import {GroupsDao} from '../../groups/groups.dao';

describe('SaveGroupHandler', () => {

    let mockedDevicesDao: jest.Mocked<DevicesDao>;
    let mockedGroupsDao: jest.Mocked<GroupsDao>;

    let instance: SaveGroupHandler;

    beforeEach(() => {
        mockedDevicesDao = createMockInstance(DevicesDao);
        mockedGroupsDao = createMockInstance(GroupsDao);

        instance = new SaveGroupHandler(mockedDevicesDao, mockedGroupsDao);
    });

    it('handle: save happy path', async() => {

        // *****    stubs   *****
        const input:DeviceAssociationModel = {
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'InProgress',
                devices: [{
                    thingName: 'core',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Success'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Success'
                }]
            },
            template: {
                name: 'template-001',
                versionNo: 2
            },
            group: {
                name: 'group-1',
                id: 'group-id-1',
                templateName: 'group-template-1',
            },
            ggGroup: {},
            ggGroupVersion: {},
            ggCoreVersion: {
                Cores: []
            },
            ggDeviceVersion: {
                Devices: []
            },
            things: {},
            certificateArns: {},
            updatedGroupVersionId: 'group-version-id-1'
        };

        const expected:DeviceAssociationModel = {
            ... input,
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'Success',
                devices: [{
                    thingName: 'core',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Success'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Success'
                }]
            },
            group: {
                name: 'group-1',
                id: 'group-id-1',
                templateName: 'group-template-1',
                deployed: false,
                versionId: 'group-version-id-1',
                versionNo: 1
            },
        };

        // *****    mocks   *****
        mockedDevicesDao.saveDeviceAssociationTask = jest.fn();
        mockedGroupsDao.saveGroup = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler
        expect(response).toEqual(expected);

        // verify everything was called the expected no. of times
        expect(mockedDevicesDao.saveDeviceAssociationTask .mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroup.mock.calls.length).toBe(1);

        // verify we saved what is expected
        expect(mockedDevicesDao.saveDeviceAssociationTask.mock.calls[0][0]).toEqual(expected.taskInfo);
        expect(mockedGroupsDao.saveGroup.mock.calls[0][0]).toEqual(expected.group);

    });

    it('handle: a failed task is still saved', async() => {

        // *****    stubs   *****
        const input:DeviceAssociationModel = {
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'Failure',
                devices: []
            },
            template: {
                name: 'template-001',
                versionNo: 2
            },
            group: {
                name: 'group-1',
                id: 'group-id-1',
                templateName: 'group-template-1',
            },
            ggGroup: {},
            ggGroupVersion: {},
            ggCoreVersion: {
                Cores: []
            },
            ggDeviceVersion: {
                Devices: []
            },
            things: {},
            certificateArns: {}
        };

        // *****    mocks   *****
        mockedDevicesDao.saveDeviceAssociationTask = jest.fn();
        mockedGroupsDao.saveGroup = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // nothing should have changed
        expect(response).toEqual(input);

        // verify nothing was called
        expect(mockedDevicesDao.saveDeviceAssociationTask .mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroup.mock.calls.length).toBe(0);

    });

});
