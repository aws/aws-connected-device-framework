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
import { GroupProfileModel } from '../profiles/profiles.models';
import { GroupsAssembler } from './groups.assembler';
import { GroupsDaoFull } from './groups.full.dao';
import { GroupModel } from './groups.models';
import { GroupsServiceFull } from './groups.full.service';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';

describe('GroupsService', () => {
    let mockedDao: jest.Mocked<GroupsDaoFull>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let mockedAssembler: jest.Mocked<GroupsAssembler>;
    let mockedProfilesService: jest.Mocked<ProfilesService>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let instance: GroupsService;

    beforeEach(() => {
        mockedDao = createMockInstance(GroupsDaoFull);
        mockedTypesService = createMockInstance(TypesServiceFull);
        mockedAssembler = createMockInstance(GroupsAssembler);
        mockedProfilesService = createMockInstance(ProfilesServiceFull);
        mockedEventEmitter = createMockInstance(EventEmitter);
        instance = new GroupsServiceFull(mockedDao, mockedTypesService, mockedAssembler,
            mockedProfilesService, mockedEventEmitter);
    });

    it('applying profile with attributes and groups to empty group', async() => {
        // stubs
        const model:GroupModel = {
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/'
        };
        const profileId = 'testProfileId';
        const profile:GroupProfileModel = {
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
                linked_to: ['path1', 'path2']
            }
        };

        const expected:GroupModel = {
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
            attributes: {
                a: 1,
                b: '2',
                c: true
            },
            groups: {
                linked_to: ['path1', 'path2']
            }
        };

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
        const model:GroupModel = {
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
            attributes: {
                a: 5,
                d: false
            },
            groups: {
                linked_to_a: ['pathA1', 'pathA2'],
                linked_to_b: ['pathA3']
            }
        };
        const profileId = 'testProfileId';
        const profile:GroupProfileModel = {
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
                linked_to_a: ['pathB1'],
                linked_to_c: ['pathB2']
            }
        };

        const expected:GroupModel = {
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
                linked_to_a: ['pathA1', 'pathA2'],
                linked_to_b: ['pathA3'],
                linked_to_c: ['pathB2']
            }
        };

        // mocks
        mockedProfilesService.get = jest.fn().mockImplementation(()=> profile);

        // execute
        const actual = await (<GroupsServiceFull>instance).___test___applyProfile(model, profileId);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });
});
