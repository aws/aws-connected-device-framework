/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { logger} from '../utils/logger';
import { DevicesServiceFull } from './devices.full.service';
import { DevicesAssembler } from './devices.assembler';
import { TypesService } from '../types/types.service';
import { TypesServiceFull } from '../types/types.full.service';
import { GroupsService } from '../groups/groups.service';
import { DevicesDaoFull } from './devices.full.dao';
import { Node} from '../data/node';
import { DeviceItem } from './devices.models';
import {EventEmitter} from '../events/eventEmitter.service';
import { ProfilesService } from '../profiles/profiles.service';
import { DeviceProfileItem } from '../profiles/profiles.models';
import { TypeCategory } from '../types/constants';
import { DevicesService } from './devices.service';
import { GroupsServiceFull } from '../groups/groups.full.service';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';
import { GroupsAssembler } from '../groups/groups.assembler';
import { AuthzServiceFull } from '../authz/authz.full.service';

const validDeviceId = 'ABC123';

describe('DevicesService', () => {
    let mockedDao: jest.Mocked<DevicesDaoFull>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let mockedDeviceAssembler: jest.Mocked<DevicesAssembler>;
    let mockedGroupsAssembler: jest.Mocked<GroupsAssembler>;
    let mockedGroupsService: jest.Mocked<GroupsService>;
    let mockedProfilesService: jest.Mocked<ProfilesService>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let mockedAuthzServiceFull: jest.Mocked<AuthzServiceFull>;
    let instance: DevicesService;

    beforeEach(() => {
        mockedDao = createMockInstance(DevicesDaoFull);
        mockedTypesService = createMockInstance(TypesServiceFull);
        mockedDeviceAssembler = createMockInstance(DevicesAssembler);
        mockedGroupsAssembler = createMockInstance(GroupsAssembler);
        mockedGroupsService = createMockInstance(GroupsServiceFull);
        mockedProfilesService = createMockInstance(ProfilesServiceFull);
        mockedAuthzServiceFull = createMockInstance(AuthzServiceFull);
        mockedEventEmitter = createMockInstance(EventEmitter);
        instance = new DevicesServiceFull(mockedDao, mockedTypesService, mockedDeviceAssembler, mockedGroupsAssembler, mockedGroupsService, mockedEventEmitter,
            mockedProfilesService, mockedAuthzServiceFull, 'parent', '/unprovisioned', 'active');
    });

    it('applying profile with attributes and groups to empty device', async() => {
        // stubs
        const model = new DeviceItem ({
            deviceId: 'device001',
            category: TypeCategory.Device,
            templateId: 'testTemplate'
        });
        const profileId = 'testPofileId';
        const profile:DeviceProfileItem = new DeviceProfileItem ({
            deviceId: null,
            category: null,
            profileId,
            templateId: model.templateId,
            attributes: {
                a: 1,
                b: '2',
                c: true
            },
            groups: {
                out: {
                    linked_to: ['path1', 'path2']
                }
            }
        });

        const expected:DeviceItem = new DeviceItem({
            deviceId: 'device001',
            category: TypeCategory.Device,
            templateId: 'testTemplate',
            attributes: {
                a: 1,
                b: '2',
                c: true
            },
            groups: {
                out: {
                    linked_to: ['path1', 'path2']
                }
            }
        });

        // mocks
        mockedProfilesService.get = jest.fn().mockImplementation(()=> profile);

        // execute
        const actual = await (<DevicesServiceFull>instance).___test___applyProfile(model, profileId);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('applying profile with attributes and groups to device with attributes and groups', async() => {
        // stubs
        const original:DeviceItem = new DeviceItem({
            deviceId: 'device001',
            category: TypeCategory.Device,
            templateId: 'testTemplate',
            attributes: {
                a: 5,
                d: false
            },
            groups: {
                out: {
                    linked_to_a: ['pathA1', 'pathA2'],
                    linked_to_b: ['pathA3']
                }
            }
        });
        const profileId = 'testPofileId';
        const profile:DeviceProfileItem = new DeviceProfileItem({
            deviceId: null,
            category: null,
            profileId,
            templateId: original.templateId,
            attributes: {
                a: 1,
                b: '2',
                c: true
            },
            groups: {
                out: {
                    linked_to_a: ['pathB1'],
                    linked_to_c: ['pathB2']
                }
            }
        });

        const expected:DeviceItem = new DeviceItem({
            deviceId: 'device001',
            category: TypeCategory.Device,
            templateId: 'testTemplate',
            attributes: {
                a: 5,
                b: '2',
                c: true,
                d: false
            },
            groups: {
                out: {
                    linked_to_a: ['pathA1', 'pathA2'],
                    linked_to_b: ['pathA3'],
                    linked_to_c: ['pathB2']
                }
            }
        });

        // mocks
        mockedProfilesService.get = jest.fn().mockImplementation(()=> profile);

        // execute
        const actual = await (<DevicesServiceFull>instance).___test___applyProfile(original, profileId);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('should return device if found', async () => {

        // set up the stubs
        const n = new Node();
        n.types = ['device', 'mote'];
        n.attributes['deviceId']=[validDeviceId];
        n.attributes['stringArrayAttribute']= ['string'];
        n.attributes['']= [123];
        n.attributes['booleanArrayAttribute']= [true];

        const dm = new DeviceItem();
        dm.templateId = 'mote';
        dm.deviceId = validDeviceId;
        dm.attributes['stringArrayAttribute'] = 'string';
        dm.attributes['numberArrayAttribute'] = 123;
        dm.attributes['booleanArrayAttribute'] = true;

        // Set the mocks on the dependent classes
        mockedDao.get = jest.fn().mockImplementation(()=> [n]);

        mockedDeviceAssembler.toDeviceItem = jest.fn().mockImplementation(()=> dm);

        // Make the call
        const device = await instance.get(validDeviceId, false, [], true);
        logger.debug(`TEST device: ${JSON.stringify(device)}`);

        // Finally, verify the results
        expect(device).toBeDefined();
        expect(device.deviceId).toEqual(validDeviceId);
        expect(device.templateId).toEqual('mote');
        expect(device.attributes['stringArrayAttribute']).toEqual('string');
        expect(device.attributes['numberArrayAttribute']).toEqual(123);
        expect(device.attributes['booleanArrayAttribute']).toEqual(true);

    });
});
