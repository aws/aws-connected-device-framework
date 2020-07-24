/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { TypesService } from '../types/types.service';
import { TypesServiceFull } from '../types/types.full.service';
import { GroupsService } from './groups.service';
import {EventEmitter} from '../events/eventEmitter.service';
import { ProfilesService } from '../profiles/profiles.service';
import { GroupProfileItem } from '../profiles/profiles.models';
import { GroupsAssembler } from './groups.assembler';
import { GroupsDaoFull } from './groups.full.dao';
import { GroupItem } from './groups.models';
import { GroupsServiceFull } from './groups.full.service';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';
import { DevicesAssembler } from '../devices/devices.assembler';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { DirectionStringToArrayMap } from '../data/model';
import { Node } from '../data/node';

describe('GroupsService', () => {
    let mockedDao: jest.Mocked<GroupsDaoFull>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let mockedGroupsAssembler: jest.Mocked<GroupsAssembler>;
    let mockedDevicesAssembler: jest.Mocked<DevicesAssembler>;
    let mockedProfilesService: jest.Mocked<ProfilesService>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let mockedAuthzServiceFull: jest.Mocked<AuthzServiceFull>;
    let instance: GroupsService;

    beforeEach(() => {
        mockedDao = createMockInstance(GroupsDaoFull);
        mockedTypesService = createMockInstance(TypesServiceFull);
        mockedGroupsAssembler = createMockInstance(GroupsAssembler);
        mockedDevicesAssembler = createMockInstance(DevicesAssembler);
        mockedProfilesService = createMockInstance(ProfilesServiceFull);
        mockedEventEmitter = createMockInstance(EventEmitter);
        mockedAuthzServiceFull = createMockInstance(AuthzServiceFull);
        instance = new GroupsServiceFull(false, mockedDao, mockedTypesService, mockedGroupsAssembler, mockedDevicesAssembler,
            mockedProfilesService, mockedAuthzServiceFull, mockedEventEmitter);
    });

    it('applying profile with attributes and groups to empty group', async() => {
        // stubs
        const model:GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/'
        });
        const profileId = 'testProfileId';
        const profile:GroupProfileItem = new GroupProfileItem({
            profileId,
            name: null,
            parentPath: null,
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

        const expected:GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
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
        const actual = await (<GroupsServiceFull>instance).___test___applyProfile(model, profileId);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('applying profile with attributes and groups to device with attributes and groups', async() => {

        // stubs
        const original:GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
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
        const profileId = 'testProfileId';
        const profile:GroupProfileItem = new GroupProfileItem({
            profileId,
            name: null,
            parentPath: null,
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

        const expected:GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
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
        const actual = await (<GroupsServiceFull>instance).___test___applyProfile(original, profileId);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('by default, parent paths rel types not validated', async() => {

        // stubs
        const toSave = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/aParent',
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

        const parentGroupItem = new GroupItem({
            name: 'aParent',
            templateId: 'root',
            parentPath: '/'
        });

        const expectedValidateRelationshipsByPathArg:DirectionStringToArrayMap = {
            out: {
                linked_to_a: ['pathA1', 'pathA2'],
                linked_to_b: ['pathA3']
            }
        };

        // mocks
        mockedTypesService.validateSubType = jest.fn().mockReturnValueOnce({isValid:true});
        const spied = mockedTypesService.validateRelationshipsByPath = jest.fn().mockReturnValueOnce(true);
        mockedDao.get = jest.fn().mockReturnValueOnce(new Node());
        mockedGroupsAssembler.toGroupItem = jest.fn().mockReturnValueOnce(parentGroupItem);

        // execute
        await instance.create(toSave);

        // verify
        expect(spied.mock.calls[0][1]).toEqual(expectedValidateRelationshipsByPathArg);

    });

    it('validate parent paths rel types if configured so', async() => {

        instance = new GroupsServiceFull(true, mockedDao, mockedTypesService, mockedGroupsAssembler, mockedDevicesAssembler,
            mockedProfilesService, mockedAuthzServiceFull, mockedEventEmitter);

        // stubs
        const toSave = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/aParent',
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

        const parentGroupItem = new GroupItem({
            name: 'aParent',
            templateId: 'root',
            parentPath: '/'
        });

        const expectedValidateRelationshipsByPathArg:DirectionStringToArrayMap = {
            out: {
                linked_to_a: ['pathA1', 'pathA2'],
                linked_to_b: ['pathA3'],
                parent: ['/aparent']
            }
        };

        // mocks
        mockedTypesService.validateSubType = jest.fn().mockReturnValueOnce({isValid:true});
        const spied = mockedTypesService.validateRelationshipsByPath = jest.fn().mockReturnValueOnce(true);
        mockedDao.get = jest.fn().mockReturnValueOnce(new Node());
        mockedGroupsAssembler.toGroupItem = jest.fn().mockReturnValueOnce(parentGroupItem);

        // execute
        await instance.create(toSave);

        // verify
        expect(spied.mock.calls[0][1]).toEqual(expectedValidateRelationshipsByPathArg);

    });
});
