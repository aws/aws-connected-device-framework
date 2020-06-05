/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS, {AWSError} from 'aws-sdk';

import {DeviceAssociationModel} from './models';
import {GetPrincipalHandler} from './getPrincipal.handler';

describe('GetPrincipalHandler', () => {

    let mockedIot: AWS.Iot;

    let instance: GetPrincipalHandler;

    beforeEach(() => {
        mockedIot = new AWS.Iot();
        const mockedIotFactory = () => {
            return mockedIot;
        };
        instance = new GetPrincipalHandler(mockedIotFactory);
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

        const expected:DeviceAssociationModel = {
            ... input,
            certificateArns: {
                'core': 'arn:aws:iot:us-west-0:123456789012:certificates/core',
                'device-1': 'arn:aws:iot:us-west-0:123456789012:certificates/device-1',
            }
        };

        // *****    mocks   *****
        const mockListThingPrincipals1Response = new MockAWSPromise<AWS.Iot.Types.ListThingPrincipalsResponse>();
        mockListThingPrincipals1Response.response = {
            principals: ['arn:aws:iot:us-west-0:123456789012:certificates/core']
        };
        const mockListThingPrincipals2Response = new MockAWSPromise<AWS.Iot.Types.ListThingPrincipalsResponse>();
        mockListThingPrincipals2Response.response = {
            principals: ['arn:aws:iot:us-west-0:123456789012:certificates/device-1']
        };
        const mockListThingPrincipals = mockedIot.listThingPrincipals = <any> jest.fn()
            .mockReturnValueOnce(mockListThingPrincipals1Response)
            .mockReturnValueOnce(mockListThingPrincipals2Response);

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler
        expect(response).toEqual(expected);

        // verify everything was called the expected no. of times
        expect(mockListThingPrincipals.mock.calls.length).toBe(2);

        // verify correct parameters were passed to the calls
        expect(mockListThingPrincipals.mock.calls[0][0]).toStrictEqual({thingName: 'core'});
        expect(mockListThingPrincipals.mock.calls[1][0]).toStrictEqual({thingName: 'device-1'});

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
        const mockListThingPrincipals = mockedIot.listThingPrincipals = <any> jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // nothing should have changed
        expect(response).toEqual(input);

        // verify nothing was called
        expect(mockListThingPrincipals.mock.calls.length).toBe(0);

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
