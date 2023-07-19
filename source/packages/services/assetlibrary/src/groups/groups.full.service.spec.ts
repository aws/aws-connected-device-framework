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

import { AuthzServiceFull } from '../authz/authz.full.service';
import { DirectionToRelatedEntityArrayMap, EntityTypeMap } from '../data/model';
import { Node } from '../data/node';
import { DevicesAssembler } from '../devices/devices.assembler';
import { EventEmitter } from '../events/eventEmitter.service';
import { ProfilesServiceFull } from '../profiles/profiles.full.service';
import { GroupProfileItem } from '../profiles/profiles.models';
import { ProfilesService } from '../profiles/profiles.service';
import { Operation, TypeCategory } from '../types/constants';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';
import { TypesServiceFull } from '../types/types.full.service';
import { TypeDefinitionStatus, TypeModel } from '../types/types.models';
import { TypesService } from '../types/types.service';
import { TypeUtils } from '../utils/typeUtils';
import { GroupsAssembler } from './groups.assembler';
import { GroupsDaoFull } from './groups.full.dao';
import { GroupsServiceFull } from './groups.full.service';
import { GroupItem } from './groups.models';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
    let isAuthzEnabled: boolean;
    let validateAllowedParentPaths: boolean;
    let mockedDao: jest.Mocked<GroupsDaoFull>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let mockedGroupsAssembler: jest.Mocked<GroupsAssembler>;
    let mockedDevicesAssembler: jest.Mocked<DevicesAssembler>;
    let mockedProfilesService: jest.Mocked<ProfilesService>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let mockedAuthzServiceFull: jest.Mocked<AuthzServiceFull>;
    let mockedTypeUtils: jest.Mocked<TypeUtils>;
    let mockedSchemaValidatorService: jest.Mocked<SchemaValidatorService>;
    let instance: GroupsService;

    beforeEach(() => {
        isAuthzEnabled = false;
        validateAllowedParentPaths = false;
        mockedDao = createMockInstance(GroupsDaoFull);
        mockedTypesService = createMockInstance(TypesServiceFull);
        mockedGroupsAssembler = createMockInstance(GroupsAssembler);
        mockedDevicesAssembler = createMockInstance(DevicesAssembler);
        mockedProfilesService = createMockInstance(ProfilesServiceFull);
        mockedEventEmitter = createMockInstance(EventEmitter);
        mockedAuthzServiceFull = createMockInstance(AuthzServiceFull);
        mockedSchemaValidatorService = createMockInstance(SchemaValidatorService);
        instance = new GroupsServiceFull(
            isAuthzEnabled,
            validateAllowedParentPaths,
            mockedAuthzServiceFull,
            mockedDevicesAssembler,
            mockedEventEmitter,
            mockedGroupsAssembler,
            mockedDao,
            mockedProfilesService,
            mockedSchemaValidatorService,
            mockedTypesService,
            mockedTypeUtils
        );
    });

    it('applying profile with attributes and groups to empty group', async () => {
        // stubs
        const model: GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
        });
        const profileId = 'testProfileId';
        const profile: GroupProfileItem = new GroupProfileItem({
            profileId,
            name: null,
            parentPath: null,
            templateId: model.templateId,
            attributes: {
                a: 1,
                b: '2',
                c: true,
            },
            groups: {
                out: {
                    linked_to: [{ id: 'path1' }, { id: 'path2' }],
                },
            },
        });

        const expected: GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
            attributes: {
                a: 1,
                b: '2',
                c: true,
            },
            groups: {
                out: {
                    linked_to: [{ id: 'path1' }, { id: 'path2' }],
                },
            },
        });

        // mocks
        mockedProfilesService.get = jest.fn().mockImplementation(() => profile);

        // execute
        const actual = await (<GroupsServiceFull>instance).___test___applyProfile(
            model,
            profileId
        );

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    it('applying profile with attributes and groups to device with attributes and groups', async () => {
        // stubs
        const original: GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
            attributes: {
                a: 5,
                d: false,
            },
            groups: {
                out: {
                    linked_to_a: [{ id: 'pathA1' }, { id: 'pathA2' }],
                    linked_to_b: [{ id: 'pathA3' }],
                },
            },
        });
        const profileId = 'testProfileId';
        const profile: GroupProfileItem = new GroupProfileItem({
            profileId,
            name: null,
            parentPath: null,
            templateId: original.templateId,
            attributes: {
                a: 1,
                b: '2',
                c: true,
            },
            groups: {
                out: {
                    linked_to_a: [{ id: 'pathB1' }],
                    linked_to_c: [{ id: 'pathB2' }],
                },
            },
        });

        const expected: GroupItem = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/',
            attributes: {
                a: 5,
                b: '2',
                c: true,
                d: false,
            },
            groups: {
                out: {
                    linked_to_a: [{ id: 'pathA1' }, { id: 'pathA2' }],
                    linked_to_b: [{ id: 'pathA3' }],
                    linked_to_c: [{ id: 'pathB2' }],
                },
            },
        });

        // mocks
        mockedProfilesService.get = jest.fn().mockImplementation(() => profile);

        // execute
        const actual = await (<GroupsServiceFull>instance).___test___applyProfile(
            original,
            profileId
        );

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    it('by default, parent paths rel types not validated', async () => {
        // stubs
        const group = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/aParent',
            attributes: {
                a: 5,
                d: false,
            },
            groups: {
                in: {
                    Linked_to_a: [{ id: '/pathA1' }, { id: '/pathA2' }],
                    Linked_to_b: [{ id: '/pathA3' }],
                },
                out: {
                    linked_to_a: [{ id: '/pathA1' }, { id: '/pathA2' }],
                    linked_to_b: [{ id: '/pathA3' }],
                },
            },
        });

        // mocks
        const mockedTemplate: TypeModel = {
            templateId: 'testTemplate',
            category: TypeCategory.Group,
            schema: {
                definition: {
                    // the method under test only uses the template properties when running in fgac and instead passes
                    // the template to other (mocked) methods for processing
                },
            },
        };
        mockedTypesService.get = jest.fn().mockResolvedValueOnce(mockedTemplate);
        mockedSchemaValidatorService.validateSubType = jest
            .fn()
            .mockResolvedValueOnce({ isValid: true });
        const mockedGroupLabels: EntityTypeMap = {
            '/patha1': ['templatea1'],
            '/patha2': ['templatea2'],
            '/patha3': ['templatea3'],
        };
        mockedSchemaValidatorService.validateRelationshipsByIds = jest
            .fn()
            .mockResolvedValueOnce({ groupLabels: mockedGroupLabels, isValid: true });
        const mockedParentNode = new Node();
        mockedParentNode.id = '/aparent';
        mockedParentNode.types = ['group', 'root'];
        mockedParentNode.category = TypeCategory.Group;
        mockedDao.get = jest.fn().mockResolvedValueOnce([mockedParentNode]);
        const mockedParent = new GroupItem({
            name: 'aParent',
            templateId: 'root',
            parentPath: '/',
        });
        mockedGroupsAssembler.toGroupItem = jest.fn().mockReturnValueOnce(mockedParent);
        const mockedNode = new Node();
        mockedNode.id = '/aparent/group001';
        mockedNode.types = ['group', 'testtemplate'];
        mockedNode.category = TypeCategory.Group;
        mockedGroupsAssembler.toNode = jest.fn().mockReturnValueOnce(mockedNode);
        mockedDao.create = jest.fn().mockImplementationOnce(undefined);

        // execute
        await instance.create(group);

        // verify
        expect(mockedTypesService.get).toBeCalledWith(
            'testtemplate',
            TypeCategory.Group,
            TypeDefinitionStatus.published
        );
        expect(mockedSchemaValidatorService.validateSubType).toBeCalledWith(
            mockedTemplate,
            group,
            Operation.CREATE
        );

        const expectedValidateRelationshipsByPathArg: DirectionToRelatedEntityArrayMap = {
            in: {
                linked_to_a: [{ id: '/patha1' }, { id: '/patha2' }],
                linked_to_b: [{ id: '/patha3' }],
            },
            out: {
                linked_to_a: [{ id: '/patha1' }, { id: '/patha2' }],
                linked_to_b: [{ id: '/patha3' }],
            },
        };
        expect(mockedSchemaValidatorService.validateRelationshipsByIds).toBeCalledWith(
            mockedTemplate,
            expectedValidateRelationshipsByPathArg,
            undefined
        );
        expect(mockedDao.get).toBeCalledWith(['/aparent'], false);
        expect(mockedDao.create).toBeCalledWith(mockedNode, group.groups);
    });

    it('validate parent paths rel types if configured so', async () => {
        validateAllowedParentPaths = true;
        instance = new GroupsServiceFull(
            isAuthzEnabled,
            validateAllowedParentPaths,
            mockedAuthzServiceFull,
            mockedDevicesAssembler,
            mockedEventEmitter,
            mockedGroupsAssembler,
            mockedDao,
            mockedProfilesService,
            mockedSchemaValidatorService,
            mockedTypesService,
            mockedTypeUtils
        );

        // stubs
        const group = new GroupItem({
            name: 'group001',
            templateId: 'testTemplate',
            parentPath: '/aParent',
            attributes: {
                a: 5,
                d: false,
            },
            groups: {
                out: {
                    linked_to_a: [{ id: '/pathA1' }, { id: '/pathA2' }],
                    linked_to_b: [{ id: '/pathA3' }],
                },
            },
        });

        // mocks
        const mockedTemplate: TypeModel = {
            templateId: 'testTemplate',
            category: TypeCategory.Group,
            schema: {
                definition: {
                    // the method under test only uses the template properties when running in fgac and instead passes
                    // the template to other (mocked) methods for processing
                },
            },
        };
        mockedTypesService.get = jest.fn().mockResolvedValueOnce(mockedTemplate);
        mockedSchemaValidatorService.validateSubType = jest
            .fn()
            .mockResolvedValueOnce({ isValid: true });
        const mockedGroupLabels: EntityTypeMap = {
            '/patha1': ['templatea1'],
            '/patha2': ['templatea2'],
            '/patha3': ['templatea3'],
        };
        mockedSchemaValidatorService.validateRelationshipsByIds = jest
            .fn()
            .mockResolvedValueOnce({ groupLabels: mockedGroupLabels, isValid: true });
        const mockedParentNode = new Node();
        mockedParentNode.id = '/aparent';
        mockedParentNode.types = ['group', 'root'];
        mockedParentNode.category = TypeCategory.Group;
        mockedDao.get = jest.fn().mockResolvedValueOnce([mockedParentNode]);
        const mockedParent = new GroupItem({
            name: 'aParent',
            templateId: 'root',
            parentPath: '/',
        });
        mockedGroupsAssembler.toGroupItem = jest.fn().mockReturnValueOnce(mockedParent);
        const mockedNode = new Node();
        mockedNode.id = '/aparent/group001';
        mockedNode.types = ['group', 'testtemplate'];
        mockedNode.category = TypeCategory.Group;
        mockedGroupsAssembler.toNode = jest.fn().mockReturnValueOnce(mockedNode);
        mockedDao.create = jest.fn().mockImplementationOnce(undefined);

        // execute
        await instance.create(group);

        // verify
        expect(mockedTypesService.get).toBeCalledWith(
            'testtemplate',
            TypeCategory.Group,
            TypeDefinitionStatus.published
        );
        expect(mockedSchemaValidatorService.validateSubType).toBeCalledWith(
            mockedTemplate,
            group,
            Operation.CREATE
        );

        const expectedValidateRelationshipsByPathArg: DirectionToRelatedEntityArrayMap = {
            out: {
                linked_to_a: [{ id: '/patha1' }, { id: '/patha2' }],
                linked_to_b: [{ id: '/patha3' }],
                parent: [{ id: '/aparent' }],
            },
        };
        expect(mockedSchemaValidatorService.validateRelationshipsByIds).toBeCalledWith(
            mockedTemplate,
            expectedValidateRelationshipsByPathArg,
            undefined
        );
        expect(mockedDao.get).toBeCalledWith(['/aparent'], false);
        expect(mockedDao.create).toBeCalledWith(mockedNode, group.groups);
    });
});
