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
                    rel1: [{id:'group1'}],
                    rel2: [{id:'group2'},{id:'group3'}]
                }
            },
            devices: {
                out: {
                    rel3:[{id:'deviceA'}],
                    rel4:[{id:'deviceB'},{id:'deviceC'}]
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
                    rel1: [{id:'group1'}]
                },
                out: {
                    rel2: [{id:'group2'},{id:'group3'}]
                }
            },
            devices: {
                in: {
                    rel3:[{id:'deviceA'}]
                },
                out: {
                    rel4:[{id:'deviceB'},{id:'deviceC'}]
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
