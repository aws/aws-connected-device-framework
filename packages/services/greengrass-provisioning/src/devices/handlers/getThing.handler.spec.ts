/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS, {AWSError} from 'aws-sdk';

import {DeviceAssociationModel} from './models';
import {GetThingHandler} from './getThing.handler';

describe('GetThingHandler', () => {

    let mockedIot: AWS.Iot;

    let instance: GetThingHandler;

    beforeEach(() => {
        mockedIot = new AWS.Iot();
        const mockedIotFactory = () => {
            return mockedIot;
        };
        instance = new GetThingHandler(mockedIotFactory);
    });

    it('handle: things exist', async() => {

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
            things: {},
            certificateArns: {}
        };

        const expected:DeviceAssociationModel = {
            ... input,
            things: {
                core: {
                    thingName: input.taskInfo.devices[0].thingName,
                    thingId: 'core-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/${input.taskInfo.devices[0].thingName}`,
                },
                'device-1': {
                    thingName: input.taskInfo.devices[1].thingName,
                    thingId: 'device-id-1',
                    thingArn: `arn:aws:iot:us-west-0:123456789012:thing/${input.taskInfo.devices[1].thingName}`,
                }
            },
        };

        // *****    mocks   *****
        const mockDescribeThing1ExistsResponse = new MockAWSPromise<AWS.Iot.DescribeThingResponse>();
        mockDescribeThing1ExistsResponse.response = {
            thingId: 'core-id-1',
            thingArn: `arn:aws:iot:us-west-0:123456789012:thing/${input.taskInfo.devices[0].thingName}`,
            thingName: input.taskInfo.devices[0].thingName,
        };
        const mockDescribeThing2ExistsResponse = new MockAWSPromise<AWS.Iot.DescribeThingResponse>();
        mockDescribeThing2ExistsResponse.response = {
            thingId: 'device-id-1',
            thingArn: `arn:aws:iot:us-west-0:123456789012:thing/${input.taskInfo.devices[1].thingName}`,
            thingName: input.taskInfo.devices[1].thingName,
        };
        const mockDescribeThing = mockedIot.describeThing = <any> jest.fn()
            .mockReturnValueOnce(mockDescribeThing1ExistsResponse)
            .mockReturnValueOnce(mockDescribeThing2ExistsResponse);

        // *****    execute   *****
        const response = await instance.handle(input);

        // verify updated response is returned, ready for the next handler
        expect(response).toEqual(expected);

        // verify everything was called the expected no. of times
        expect(mockDescribeThing.mock.calls.length).toBe(2);

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
        const mockDescribeThing = mockedIot.describeThing = <any> jest.fn();

        // *****    execute   *****
        const response = await instance.handle(input);

        // nothing should have changed
        expect(response).toEqual(input);

        // verify nothing was called
        expect(mockDescribeThing.mock.calls.length).toBe(0);

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
