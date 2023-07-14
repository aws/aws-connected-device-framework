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

import AWS from 'aws-sdk';
import { OrganizationalUnitsService } from './organizationalUnits.service';
import { CreateOrganizationalUnitRequest } from 'aws-sdk/clients/organizations';
import { OrganizationalUnitResource } from './organizationalUnits.model';
import { createMockInstance } from 'jest-create-mock-instance';
import { OrganizationalUnitsDao } from './organizationalUnits.dao';
import { OrganizationalUnitsAssembler } from './organizationalUnits.assembler';
import { AccountsDao } from '../accounts/accounts.dao';

describe('OrganizationalUnitService', function () {
    let instance: OrganizationalUnitsService;
    let mockedOrganizations: AWS.Organizations;
    let mockedOrganizationalUnitsDao: OrganizationalUnitsDao;
    let mockAccountsDao: AccountsDao;
    const fakeRootId = { Id: 'fakeRootId' };
    const createOrganizationalUnitInput: OrganizationalUnitResource = {
        name: 'ou-test-1',
        tags: {
            createdAt: 'now',
        },
    };

    beforeEach(() => {
        mockedOrganizations = new AWS.Organizations();
        mockedOrganizations.listRoots = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({ Roots: [] }) });
        const mockOrganizationsFactory = () => {
            return mockedOrganizations;
        };
        mockedOrganizationalUnitsDao = createMockInstance(OrganizationalUnitsDao);
        mockAccountsDao = createMockInstance(AccountsDao);

        mockedOrganizationalUnitsDao.createOrganizationalUnit = jest.fn();

        instance = new OrganizationalUnitsService(
            true,
            true,
            mockedOrganizationalUnitsDao,
            new OrganizationalUnitsAssembler(),
            mockAccountsDao,
            mockOrganizationsFactory,
        );
    });

    it('createOrganizationalUnit: happy path', async () => {
        mockedOrganizations.listRoots = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({ Roots: [fakeRootId] }) });

        const mockCreateOrganizationalUnit = (mockedOrganizations.createOrganizationalUnit = <any>(
            jest.fn().mockReturnValueOnce({ promise: () => Promise.resolve({}) })
        ));

        await instance.createOrganizationalUnit(createOrganizationalUnitInput);

        const createOrganizationalUnitRequest: CreateOrganizationalUnitRequest =
            mockCreateOrganizationalUnit.mock.calls[0][0];

        expect(createOrganizationalUnitRequest.ParentId).toBe('fakeRootId');
        expect(createOrganizationalUnitRequest.Name).toBe(createOrganizationalUnitInput.name);
        expect(createOrganizationalUnitRequest.Tags).toContainEqual({
            Key: 'createdAt',
            Value: 'now',
        });
    });

    it('createOrganizationalUnit: invalid input', async () => {
        const invalidInput = {} as OrganizationalUnitResource;
        await expect(instance.createOrganizationalUnit(invalidInput)).rejects.toThrow(
            'Expected object to not be empty',
        );
    });

    it('createOrganizationalUnit: list roots throws exception', async () => {
        mockedOrganizations.listRoots = jest.fn().mockReturnValueOnce({
            promise: () => {
                throw new Error('aws organizations exception');
            },
        });
        await expect(
            instance.createOrganizationalUnit(createOrganizationalUnitInput),
        ).rejects.toThrow('aws organizations exception');
    });

    it('createOrganizationalUnit: return no roots', async () => {
        mockedOrganizations.createOrganizationalUnit = <any>(
            jest.fn().mockReturnValueOnce({ promise: () => Promise.resolve({}) })
        );
        await expect(
            instance.createOrganizationalUnit(createOrganizationalUnitInput),
        ).rejects.toThrow('root cannot be found in current organizations');
    });

    it('listOrganizationalUnits: happy path', async () => {
        mockedOrganizations.listRoots = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({ Roots: [fakeRootId] }) });
        mockedOrganizations.listOrganizationalUnitsForParent = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    OrganizationalUnits: [
                        {
                            Id: 'ou-1',
                            Name: 'ou-number-1',
                        },
                    ],
                }),
        });
        mockedOrganizations.listTagsForResource = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    Tags: [
                        {
                            Key: 'ouOneKey',
                            Value: 'ouOneValue',
                        },
                    ],
                }),
        });
        const listOrganizationalUnitsResponse = await instance.listOrganizationalUnits();
        expect(listOrganizationalUnitsResponse.length).toBe(1);
        expect(listOrganizationalUnitsResponse[0]).toEqual({
            name: 'ou-number-1',
            id: 'ou-1',
            tags: { ouOneKey: 'ouOneValue' },
        });
    });

    it('listOrganizationalUnits: return no organizational units for roots', async () => {
        mockedOrganizations.listOrganizationalUnitsForParent = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    OrganizationalUnits: [],
                }),
        });
        const listOrganizationalUnitsResponse = await instance.listOrganizationalUnits();
        expect(listOrganizationalUnitsResponse.length).toBe(0);
    });

    it('listOrganizationalUnits: list tag resource throws exception', async () => {
        mockedOrganizations.listOrganizationalUnitsForParent = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    OrganizationalUnits: [
                        {
                            Id: 'ou-1',
                            Name: 'ou-number-1',
                        },
                    ],
                }),
        });
        mockedOrganizations.listTagsForResource = jest.fn().mockReturnValueOnce({
            promise: () => {
                throw new Error('tag cannot be found');
            },
        });
        await expect(instance.listOrganizationalUnits()).rejects.toThrow('tag cannot be found');
    });

    it('getOrganizationalUnit: happy path', async () => {
        mockedOrganizationalUnitsDao.getOrganizationalUnit = jest.fn().mockResolvedValue({
            id: 'ou-1',
            name: 'ou-number-1',
        });

        mockedOrganizations.listTagsForResource = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    Tags: [
                        {
                            Key: 'ouOneKey',
                            Value: 'ouOneValue',
                        },
                    ],
                }),
        });
        const getOrganizationalUnitResponse = await instance.getOrganizationalUnit('ou-number-1');
        expect(getOrganizationalUnitResponse.name).toBe('ou-number-1');
        expect(getOrganizationalUnitResponse.tags).toEqual({ ouOneKey: 'ouOneValue' });
    });

    it('getOrganizationalUnit: ou does not exist in dynamodb', async () => {
        mockedOrganizationalUnitsDao.getOrganizationalUnit = jest
            .fn()
            .mockResolvedValue(undefined);
        const organizationalUnit = await instance.getOrganizationalUnit('ou-number-2');
        expect(organizationalUnit).toBeUndefined();
    });
});
