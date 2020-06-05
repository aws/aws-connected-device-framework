/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import AWS from 'aws-sdk';

import {CreateGroupVersionHandler} from './createGroupVersion.handler';
import {DeviceAssociationModel} from './models';
import {GreengrassUtils} from '../../utils/greengrass.util';
import {SubscriptionsService} from '../../subscriptions/subscriptions.service';

describe('CreateGroupVersionHandler', () => {

    let mockedGreengrassUtils: jest.Mocked<GreengrassUtils>;
    let mockedSubscriptionsService: jest.Mocked<SubscriptionsService>;

    let instance: CreateGroupVersionHandler;

    beforeEach(() => {
        mockedGreengrassUtils = createMockInstance(GreengrassUtils);
        mockedSubscriptionsService = createMockInstance(SubscriptionsService);

        instance = new CreateGroupVersionHandler(mockedGreengrassUtils, mockedSubscriptionsService);
    });

    it('handle: happy path', async() => {

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
                    status: 'InProgress'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'InProgress'
                }]
            },
            group: {
                name: 'group-1',
                id: 'group-id-1',
                templateName: 'group-template-1',
            },
            ggGroup: {
                Id: 'group-id-1',
                LatestVersion: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/groups/group-id-1/versions/group-version-id-1',
            },
            ggGroupVersion: {
                CoreDefinitionVersionArn: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/cores/core-def-1/versions/core-def-version-1',
                DeviceDefinitionVersionArn: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/devices/device-def-1/versions/device-def-version-1',
            },
            ggCoreVersion: {
                Cores: []
            },
            ggDeviceVersion: {
                Devices: []
            },
            things: {
                core: {
                    thingName: 'core',
                    thingId: 'core-id-1',
                    thingArn: 'thing-arn-1',
                },
                'device-1': {
                    thingName: 'core',
                    thingId: 'core-id-1',
                    thingArn: 'thing-arn-1',
                }
            },
            certificateArns: {
                core: 'arn:aws:iot:us-west-0:123456789012:cert/core-cert-1',
                'device-1': 'arn:aws:iot:us-west-0:123456789012:cert/device-cert-1',
            }
        };

        const expected:DeviceAssociationModel = {
            ... input,
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
            updatedGroupVersionId: 'arn:aws:greengrass:us-west-0:123456789012:/greengrass/groups/group-id-1/versions/group-version-id-2',
        };

        // *****    mocks   *****
        mockedGreengrassUtils.createCoreDefinitionVersion = jest.fn().mockReturnValueOnce('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/cores/core-def-1/versions/core-def-version-2');
        mockedGreengrassUtils.createDeviceDefinitionVersion = jest.fn().mockReturnValueOnce('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/devices/device-def-1/versions/device-def-version-2');
        mockedGreengrassUtils.createGroupVersion = jest.fn().mockReturnValueOnce('arn:aws:greengrass:us-west-0:123456789012:/greengrass/groups/group-id-1/versions/group-version-id-2');

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler
        expect(response).toEqual(expected);

        // verify everything was called the expected no. of times
        expect(mockedGreengrassUtils.createCoreDefinitionVersion.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.createDeviceDefinitionVersion.mock.calls.length).toBe(1);
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls.length).toBe(1);

        // verify a new greengrass core version was created as expected
        expect(mockedGreengrassUtils.createCoreDefinitionVersion.mock.calls[0][0]).toEqual(input.ggGroupVersion.CoreDefinitionVersionArn);
        expect(mockedGreengrassUtils.createCoreDefinitionVersion.mock.calls[0][1]).toEqual(<AWS.Greengrass.CoreDefinitionVersion> {
            Cores:[{
                CertificateArn: input.certificateArns['core'],
                Id: input.things['core'].thingId,
                ThingArn: input.things['core'].thingArn,
                SyncShadow: true
            }]
        });

        // verify a new greengrass device version was created as expected
        expect(mockedGreengrassUtils.createDeviceDefinitionVersion.mock.calls[0][0]).toEqual(input.ggGroupVersion.DeviceDefinitionVersionArn);
        expect(mockedGreengrassUtils.createDeviceDefinitionVersion.mock.calls[0][1]).toEqual(<AWS.Greengrass.DeviceDefinitionVersion> {
            Devices:[{
                CertificateArn: input.certificateArns['device-1'],
                Id: input.things['device-1'].thingId,
                ThingArn: input.things['device-1'].thingArn,
                SyncShadow: true
            }]
        });

        // verify a new greengrass group version was created as expected
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls[0][0]).toEqual(input.ggGroup.Id);
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls[0][1]).toEqual(input.ggGroupVersion);
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls[0][2]).toEqual('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/cores/core-def-1/versions/core-def-version-2');
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls[0][3]).toEqual('arn:aws:greengrass:us-west-0:123456789012:/greengrass/definition/devices/device-def-1/versions/device-def-version-2');
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls[0][4]).toEqual(undefined);

    });

    it('handle: don\'t process failed task', async() => {

        // *****    stubs   *****
        const input:DeviceAssociationModel = {
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'Failure',
                devices: []
            },
            group: {
                name: 'group-1',
                templateName: 'group-template-1',
            },
            ggGroup: {
                Id: 'group-id-1',
            },
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
        mockedGreengrassUtils.createCoreDefinitionVersion = jest.fn();
        mockedGreengrassUtils.createDeviceDefinitionVersion = jest.fn();
        mockedGreengrassUtils.createGroupVersion = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // nothing should have changed
        expect(response).toEqual(input);

        // verify nothing was called
        expect(mockedGreengrassUtils.createCoreDefinitionVersion.mock.calls.length).toBe(0);
        expect(mockedGreengrassUtils.createDeviceDefinitionVersion.mock.calls.length).toBe(0);
        expect(mockedGreengrassUtils.createGroupVersion.mock.calls.length).toBe(0);

    });

});
