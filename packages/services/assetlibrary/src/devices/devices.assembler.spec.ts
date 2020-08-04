/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { DevicesAssembler } from './devices.assembler';
import { DeviceItem, Device10Resource, Device20Resource } from './devices.models';
import { FullAssembler } from '../data/full.assembler';

describe('DevicesAssembler', () => {
    let mockedFullAssembler: jest.Mocked<FullAssembler>;
    let instance: DevicesAssembler;

    beforeEach(() => {
        mockedFullAssembler = createMockInstance(FullAssembler);
        instance = new DevicesAssembler(mockedFullAssembler);
    });

    it('v1 resource relations assembled to item correctly', async() => {
        // stubs
        const resource = new Device10Resource ();
        resource.deviceId= 'device001';
        resource.templateId= 'templateA';
        resource.groups = {
            rel1: ['group1'],
            rel2: ['group2','group3']
        };
        resource.devices = {
            rel3:['deviceA'],
            rel4:['deviceB','deviceC']
        };

        const expected:DeviceItem = new DeviceItem({
            deviceId: 'device001',
            templateId: 'templateA',
            groups: {
                out: {
                    rel1: ['group1'],
                    rel2: ['group2','group3']
                }
            },
            devices: {
                out: {
                    rel3:['deviceA'],
                    rel4:['deviceB','deviceC']
                }
            }
        });

        // execute
        const actual = instance.fromDeviceResource(resource);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('v2 resource relations assembled to item correctly', async() => {
        // stubs
        const resource = new Device20Resource ();
        resource.deviceId= 'device001';
        resource.templateId= 'templateA';
        resource.groups = {
            in: {
                rel1: ['group1']
            },
            out: {
                rel2: ['group2','group3']
            }
        };
        resource.devices = {
            in: {
                rel3:['deviceA']
            },
            out: {
                rel4:['deviceB','deviceC']
            }
        };

        const expected:DeviceItem = new DeviceItem({
            deviceId: 'device001',
            templateId: 'templateA',
            groups: {
                in: {
                    rel1: ['group1']
                },
                out: {
                    rel2: ['group2','group3']
                }
            },
            devices: {
                in: {
                    rel3:['deviceA']
                },
                out: {
                    rel4:['deviceB','deviceC']
                }
            }
        });

        // execute
        const actual = instance.fromDeviceResource(resource);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

});
