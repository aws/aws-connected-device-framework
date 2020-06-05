/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import {DeviceAssociationModel} from './models';
import {S3Utils} from '../../utils/s3.util';
import { ThingsService } from '@cdf/provisioning-client';
import {ProvisionThingHandler} from './provisonThing.handler';
import {ProvisionThingRequest, ProvisionThingResponse} from '@cdf/provisioning-client/dist';
import { mock } from 'jest-mock-extended';

describe('ProvisionThingHandler', () => {

    const certificatesBucket = 'bucket';
    const certificatesPrefix = 'prefix';

    let mockedS3Utils: jest.Mocked<S3Utils>;
    let mockedThingsService: jest.Mocked<ThingsService>;

    let instance: ProvisionThingHandler;

    beforeEach(() => {
        mockedS3Utils = createMockInstance(S3Utils);
        mockedThingsService = mock<ThingsService>();
        instance = new ProvisionThingHandler(certificatesBucket, certificatesPrefix, mockedS3Utils, mockedThingsService);
    });

    it('handle: devices provisioned', async() => {

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
        mockedThingsService.provisionThing = jest.fn();
        mockedS3Utils.uploadStreamToS3 = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler. nothing should have changed
        expect(response).toEqual(input);

        // verify everything was called the expected no. of times
        expect(mockedThingsService.provisionThing.mock.calls.length).toBe(2);

        // verify the correct info was passed to provisioning
        expect(mockedThingsService.provisionThing.mock.calls[0][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[0].provisioningTemplate,
            parameters: input.taskInfo.devices[0].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[0].cdfProvisioningParameters
        });
        expect(mockedThingsService.provisionThing.mock.calls[1][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[1].provisioningTemplate,
            parameters: input.taskInfo.devices[1].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[1].cdfProvisioningParameters
        });

        // no certs should have been created with this test
        expect(mockedS3Utils.uploadStreamToS3.mock.calls.length).toBe(0);

    });

    it('handle: only items that need to be provisioned are provisioned', async() => {

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
                    status: 'InProgress'
                }]
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
        mockedThingsService.provisionThing = jest.fn();
        mockedS3Utils.uploadStreamToS3 = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler. nothing should have changed
        expect(response).toEqual(input);

        // verify everything was called the expected no. of times
        expect(mockedThingsService.provisionThing.mock.calls.length).toBe(1);

        // verify the correct info was passed to provisioning
        expect(mockedThingsService.provisionThing.mock.calls[0][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[1].provisioningTemplate,
            parameters: input.taskInfo.devices[1].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[1].cdfProvisioningParameters
        });

        // no certs should have been created with this test
        expect(mockedS3Utils.uploadStreamToS3.mock.calls.length).toBe(0);
    });

    it('handle: certs are created if requested', async() => {

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
                }]
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
        mockedThingsService.provisionThing = jest.fn().mockReturnValueOnce(<ProvisionThingResponse> {
            certificatePem: 'certificate-pem-1'
        });
        mockedS3Utils.uploadStreamToS3 = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler. nothing should have changed
        expect(response).toEqual(input);

        // verify everything was called the expected no. of times
        expect(mockedThingsService.provisionThing.mock.calls.length).toBe(1);
        expect(mockedS3Utils.uploadStreamToS3.mock.calls.length).toBe(1);

        // verify the correct info was passed to provisioning
        expect(mockedThingsService.provisionThing.mock.calls[0][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[0].provisioningTemplate,
            parameters: input.taskInfo.devices[0].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[0].cdfProvisioningParameters
        });

        // ensure cert was uploaded
        expect(mockedS3Utils.uploadStreamToS3.mock.calls[0][0]).toEqual(certificatesBucket);
        expect(mockedS3Utils.uploadStreamToS3.mock.calls[0][1]).toEqual(`${certificatesPrefix}${input.ggGroup.Id}/${input.taskInfo.devices[0].thingName}/certs.zip`);
        expect(mockedS3Utils.uploadStreamToS3.mock.calls[0][2]).toBeDefined();
    });

    it('handle: failed provisions are marked as failures', async() => {

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
                    status: 'InProgress'
                }, {
                    thingName: 'device-1',
                    type: 'device',
                    provisioningTemplate: 'device-template',
                    status: 'Failure',
                    statusMessage: 'Failed provisioning: Error'
                }]
            }
        };

        // *****    mocks   *****
        mockedThingsService.provisionThing = jest.fn()
            .mockReturnValueOnce({})
            .mockImplementationOnce((_params)=> {throw new Error();});
        mockedS3Utils.uploadStreamToS3 = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler
        expect(response.certificateArns).toEqual(expected.certificateArns);
        expect(response.things).toEqual(expected.things);
        expect(response.taskInfo.taskId).toEqual(expected.taskInfo.taskId);
        expect(response.taskInfo.groupName).toEqual(expected.taskInfo.groupName);
        expect(response.taskInfo.status).toEqual(expected.taskInfo.status);
        expect(response.taskInfo.devices.length).toEqual(expected.taskInfo.devices.length);
        expect(response.taskInfo.devices[0].thingName).toEqual(expected.taskInfo.devices[0].thingName);
        expect(response.taskInfo.devices[0].type).toEqual(expected.taskInfo.devices[0].type);
        expect(response.taskInfo.devices[0].provisioningTemplate).toEqual(expected.taskInfo.devices[0].provisioningTemplate);
        expect(response.taskInfo.devices[0].status).toEqual(expected.taskInfo.devices[0].status);
        expect(response.taskInfo.devices[1].thingName).toEqual(expected.taskInfo.devices[1].thingName);
        expect(response.taskInfo.devices[1].type).toEqual(expected.taskInfo.devices[1].type);
        expect(response.taskInfo.devices[1].provisioningTemplate).toEqual(expected.taskInfo.devices[1].provisioningTemplate);
        expect(response.taskInfo.devices[1].status).toEqual(expected.taskInfo.devices[1].status);
        expect(response.group).toEqual(expected.group);
        expect(response.updatedGroupVersionId).toEqual(expected.updatedGroupVersionId);

        // verify everything was called the expected no. of times
        expect(mockedThingsService.provisionThing.mock.calls.length).toBe(2);

        // verify the correct info was passed to provisioning
        expect(mockedThingsService.provisionThing.mock.calls[0][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[0].provisioningTemplate,
            parameters: input.taskInfo.devices[0].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[0].cdfProvisioningParameters
        });
        expect(mockedThingsService.provisionThing.mock.calls[1][0]).toStrictEqual(<ProvisionThingRequest>{
            provisioningTemplateId: input.taskInfo.devices[1].provisioningTemplate,
            parameters: input.taskInfo.devices[1].provisioningParameters,
            cdfProvisioningParameters: input.taskInfo.devices[1].cdfProvisioningParameters
        });

        // no certs should have been created with this test
        expect(mockedS3Utils.uploadStreamToS3.mock.calls.length).toBe(0);
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
        mockedThingsService.provisionThing = jest.fn();
        mockedS3Utils.uploadStreamToS3 = jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // nothing should have changed
        expect(response).toEqual(input);

        // verify nothing was called
        expect(mockedThingsService.provisionThing.mock.calls.length).toBe(0);
        expect(mockedS3Utils.uploadStreamToS3.mock.calls.length).toBe(0);

    });

});
