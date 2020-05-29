/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import {DeviceAssociationModel} from './models';
import {ExistingAssociationHandler} from './existingAssociation.handler';

describe('ExistingAssociationHandler', () => {

    const accountId = '123456789012';
    const region = 'us-west-0';

    let instance: ExistingAssociationHandler;

    beforeEach(() => {
        instance = new ExistingAssociationHandler(accountId, region);
    });

    it('handle: things not already associated', async() => {

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
                    status: 'Waiting'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Waiting'
                }]
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
            things: {
                core: {
                    thingName: 'core',
                    thingId: 'core-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/core`,
                },
                'device-1': {
                    thingName: 'device-1',
                    thingId: 'device-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/device-1`,
                }
            },
            certificateArns: {}
        };

        // *****   nothing to mock   *****

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify that nothing was changed in the response
        expect(response).toEqual(input);

    });

    it('handle: core already associated', async() => {

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
                    status: 'Waiting'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Waiting'
                }]
            },
            group: {
                name: 'group-1',
                id: 'group-id-1',
                templateName: 'group-template-1',
            },
            ggGroup: {},
            ggGroupVersion: {},
            ggCoreVersion: {
                Cores: [{
                    Id: 'core',
                    ThingArn: 'arn:aws:iot:us-west-0:123456789012:thing/core',
                    CertificateArn: 'xxx'
                }]
            },
            ggDeviceVersion: {
                Devices: []
            },
            things: {
                core: {
                    thingName: 'core',
                    thingId: 'core-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/core`,
                },
                'device-1': {
                    thingName: 'device-1',
                    thingId: 'device-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/device-1`,
                }
            },
            certificateArns: {}
        };

        const expected:DeviceAssociationModel = {
            ...input,
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'InProgress',
                devices: [{
                    thingName: 'core',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Success',
                    statusMessage: 'Already exists as the core',
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Waiting'
                }]
            },
        };

        // *****   nothing to mock   *****

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify that nothing was changed in the response
        expect(response).toEqual(expected);

    });

    it('handle: device already associated', async() => {

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
                    status: 'Waiting'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Waiting'
                }]
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
                Devices: [{
                    Id: 'device-1',
                    ThingArn: 'arn:aws:iot:us-west-0:123456789012:thing/device-1',
                    CertificateArn: 'xxx'
                }]
            },
            things: {
                core: {
                    thingName: 'core',
                    thingId: 'core-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/core`,
                },
                'device-1': {
                    thingName: 'device-1',
                    thingId: 'device-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/device-1`,
                }
            },
            certificateArns: {}
        };

        const expected:DeviceAssociationModel = {
            ...input,
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'InProgress',
                devices: [{
                    thingName: 'core',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Waiting',
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Success',
                    statusMessage: 'Already exists as a device',
                }]
            },
        };

        // *****   nothing to mock   *****

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify that nothing was changed in the response
        expect(response).toEqual(expected);

    });

    it('handle: more than 2 cores specified', async() => {

        // *****    stubs   *****
        const input:DeviceAssociationModel = {
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'InProgress',
                devices: [{
                    thingName: 'core-1',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Waiting'
                }, {
                    thingName: 'core-2',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Waiting'
                }]
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
            things: {
                'core-1': {
                    thingName: 'core-1',
                    thingId: 'core-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/core-1`,
                },
                'core-2': {
                    thingName: 'core-2',
                    thingId: 'core-id-2',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/core-2`,
                }
            },
            certificateArns: {}
        };

        const expected:DeviceAssociationModel = {
            ...input,
            taskInfo: {
                taskId: 'task-123',
                groupName: 'group-1',
                status: 'Failure',
                statusMessage: 'More than 1 core was specified',
                devices: [{
                    thingName: 'core-1',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Failure',
                    statusMessage: 'More than 1 core was specified'
                }, {
                    thingName: 'core-2',
                    type: 'core',
                    provisioningTemplate: 'core-template',
                    status: 'Failure',
                    statusMessage: 'More than 1 core was specified'
                }]
            },
        };

        // *****   nothing to mock   *****

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify that nothing was changed in the response
        expect(response).toEqual(expected);

    });

});
