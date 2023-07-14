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
import { AccountsService } from './accounts.service';
import {
    AccountComponentModel,
    AccountCreationRequest,
    AccountResource,
    AccountsItem,
} from './accounts.models';
import { ProvisionProductInput } from 'aws-sdk/clients/servicecatalog';
import { createMockInstance } from 'jest-create-mock-instance';
import { AccountsDao } from './accounts.dao';
import { AccountsAssembler } from './accounts.assembler';
import { ComponentResource } from '../components/components.model';
import { OrganizationalUnitsDao } from '../organizationalUnits/organizationalUnits.dao';

describe('AccountsService', function () {
    let mockedAccountsDao: jest.Mocked<AccountsDao>;
    let mockedOrganizationalUnitsDao: jest.Mocked<OrganizationalUnitsDao>;
    const accountItemToReturn: AccountsItem = {
        name: 'cdf-account-one',
        accountId: '1234',
        status: 'ACTIVE',
        email: 'cdf@email.com',
        ssoEmail: 'cdf-sso@email.com',
        ssoFirstName: 'John',
        ssoLastName: 'Smith',
        organizationalUnitId: 'ou-org-1',
        regions: ['us-west-2'],
    };

    const request: AccountCreationRequest = {
        ...accountItemToReturn,
        accountId: undefined,
        createAccountRequestId: 'some-unique-token',
        tags: {
            environment: 'development',
        },
    };

    let instance: AccountsService;
    let mockedServiceCatalog: AWS.ServiceCatalog;
    let mockedOrganizations: AWS.Organizations;

    mockedServiceCatalog = new AWS.ServiceCatalog();
    const mockedServiceCatalogFactory = () => {
        return mockedServiceCatalog;
    };

    mockedOrganizations = new AWS.Organizations();
    const mockedOrganizationsFactory = () => {
        return mockedOrganizations;
    };

    beforeEach(() => {
        jest.resetAllMocks();

        mockedAccountsDao = createMockInstance(AccountsDao);
        mockedOrganizationalUnitsDao = createMockInstance(OrganizationalUnitsDao);
        mockedAccountsDao.getAccountByName.mockResolvedValue(accountItemToReturn);
        mockedAccountsDao.getAccountById.mockResolvedValue(accountItemToReturn);

        mockedOrganizationalUnitsDao.getOrganizationalUnits = jest
            .fn()
            .mockResolvedValueOnce([{ id: 'ou-org-1' }]);

        mockedServiceCatalog.searchProductsAsAdmin = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    ProductViewDetails: [
                        {
                            ProductViewSummary: {
                                Name: 'fakeProductName',
                                ProductId: '',
                            },
                        },
                    ],
                }),
        });

        mockedServiceCatalog.listProvisioningArtifacts = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    ProvisioningArtifactDetails: [
                        {
                            Active: true,
                            Id: 'pp-1',
                        },
                    ],
                }),
        });
        instance = new AccountsService(
            true,
            true,
            'fakeSuspendedOu',
            'fakeOwner',
            'fakeProductName',
            mockedAccountsDao,
            mockedOrganizationalUnitsDao,
            new AccountsAssembler(),
            mockedServiceCatalogFactory,
            mockedOrganizationsFactory,
        );
    });

    it('createAccount: happy path and createAccountInControlTower is disabled', async () => {
        instance = new AccountsService(
            false,
            false,
            'fakeSuspendedOu',
            'fakeOwner',
            'fakeProductName',
            mockedAccountsDao,
            mockedOrganizationalUnitsDao,
            new AccountsAssembler(),
            mockedServiceCatalogFactory,
            mockedOrganizationsFactory,
        );

        const mockedProvisionProduct = (mockedServiceCatalog.provisionProduct = jest
            .fn()
            .mockReturnValueOnce({
                promise: () => Promise.resolve({}),
            }));

        const mockCreateAccounts = (mockedAccountsDao.createAccount = jest.fn());

        const requestWithAccountId = {
            ...request,
            accountId: '1234',
        };

        await instance.createAccount(requestWithAccountId);

        const createAccountRequest: AccountsItem = mockCreateAccounts.mock.calls[0][0];

        expect(createAccountRequest.accountId).toBe('1234');
        expect(createAccountRequest.status).toBe('ACTIVE');
        expect(mockedProvisionProduct).not.toHaveBeenCalled();
    });

    it('createAccount: happy path and createAccountInControlTower is enabled', async () => {
        const mockedProvisionProduct = (mockedServiceCatalog.provisionProduct = jest
            .fn()
            .mockReturnValueOnce({
                promise: () => Promise.resolve({}),
            }));

        const mockCreateAccounts = (mockedAccountsDao.createAccount = jest.fn());

        await instance.createAccount(request);

        const createAccountRequest: AccountsItem = mockCreateAccounts.mock.calls[0][0];

        expect(createAccountRequest.accountId).toBeUndefined();
        expect(createAccountRequest.status).toBe('CREATING');
        const provisionProductRequest: ProvisionProductInput =
            mockedProvisionProduct.mock.calls[0][0];

        expect(provisionProductRequest.ProvisionedProductName).toBe('cdf-account-one');

        expect(provisionProductRequest.ProvisioningParameters).toContainEqual({
            Key: 'AccountEmail',
            Value: 'cdf@email.com',
        });
        expect(provisionProductRequest.ProvisioningParameters).toContainEqual({
            Key: 'ManagedOrganizationalUnit',
            Value: 'ou-org-1',
        });
        expect(provisionProductRequest.ProvisioningParameters).toContainEqual({
            Key: 'AccountName',
            Value: 'cdf-account-one',
        });

        expect(provisionProductRequest.ProvisioningParameters).toContainEqual({
            Key: 'SSOUserFirstName',
            Value: 'John',
        });
        expect(provisionProductRequest.ProvisioningParameters).toContainEqual({
            Key: 'SSOUserLastName',
            Value: 'Smith',
        });
    });

    it('createAccount: no control tower product', async () => {
        mockedServiceCatalog.searchProductsAsAdmin = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    ProductViewDetails: [],
                }),
        });

        await expect(instance.createAccount(request)).rejects.toThrow(
            'no control tower product exists in this account',
        );
    });

    it('createAccount: control tower service catalog product does not have active version', async () => {
        mockedServiceCatalog.listProvisioningArtifacts = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    ProvisioningArtifactDetails: [
                        {
                            Active: false,
                            Id: 'pp-1',
                        },
                    ],
                }),
        });

        await expect(instance.createAccount(request)).rejects.toThrow(
            'no active control tower service catalog product exists in this account',
        );
    });

    it('validateComponentDeployed: should set account state to PROVISIONED', async () => {
        const componentResourceList = [
            {
                name: 'cdf-provisioning',
                bypassCheck: true,
            },
        ] as ComponentResource[];

        const componentsByAccount = [
            {
                componentName: 'cdf-provisioning',
                region: 'ap-southeast-2',
                status: 'CREATED',
            },
            {
                componentName: 'cdf-provisioning',
                region: 'us-west-2',
                status: 'CREATED',
            },
        ] as AccountComponentModel[];

        mockedAccountsDao.getAccountByName.mockResolvedValue({
            regions: ['ap-southeast-2', 'us-west-2'],
        } as AccountResource);
        mockedAccountsDao.listComponentsByAccount.mockResolvedValue(componentsByAccount);

        const result = await instance.areAllComponentsDeployed(
            'fakeAccountName',
            componentResourceList,
        );
        expect(result).toBe(true);
    });

    it('validateComponentDeployed: should do nothing if not all components are CREATED', async () => {
        const componentResourceList = [
            {
                name: 'cdf-provisioning',
                bypassCheck: false,
            },
        ] as ComponentResource[];

        const componentsByAccount = [
            {
                componentName: 'cdf-provisioning',
                region: 'ap-southeast-2',
                status: 'CREATED',
            },
            {
                componentName: 'cdf-commands',
                region: 'ap-southeast-2',
                status: 'CREATED',
            },
        ] as AccountComponentModel[];

        mockedAccountsDao.getAccountByName.mockResolvedValue({
            regions: ['ap-southeast-2', 'us-west-2'],
        } as AccountResource);
        mockedAccountsDao.listComponentsByAccount.mockResolvedValue(componentsByAccount);

        const result = await instance.areAllComponentsDeployed(
            'fakeAccountName',
            componentResourceList,
        );
        expect(result).toBe(false);
    });

    it('getAccountByName: happy path', async () => {
        const {
            name: accountName,
            organizationalUnitId: organizationalUnit,
            email,
            ssoEmail,
            ssoLastName,
            ssoFirstName,
            regions,
        } = request;

        const accountToCheck = await instance.getAccountByName(accountName);
        expect(accountToCheck.name).toBe(accountName);
        expect(accountToCheck.email).toBe(email);
        expect(accountToCheck.organizationalUnitId).toBe(organizationalUnit);
        expect(accountToCheck.ssoEmail).toBe(ssoEmail);
        expect(accountToCheck.ssoFirstName).toBe(ssoFirstName);
        expect(accountToCheck.ssoLastName).toBe(ssoLastName);
        expect(accountToCheck.regions).toEqual(regions);
        expect(accountToCheck.accountId).toEqual('1234');
        expect(accountToCheck.status).toEqual('ACTIVE');
    });

    it('getAccountByName: product does not exist in dynamodb', async () => {
        const { name: accountName } = request;
        mockedAccountsDao.getAccountByName.mockResolvedValue(undefined);
        await expect(instance.getAccountByName(accountName)).rejects.toThrow('NOT_FOUND');
    });

    it('deleteAccount: happy path  and deleteAccountInControlTower is enabled', async () => {
        const mockDeleteAccountDetails = (mockedAccountsDao.deleteAccount = jest.fn());
        const mockMoveAccount = (mockedOrganizations.moveAccount = jest.fn());
        mockMoveAccount.mockReturnValue({ promise: () => Promise.resolve() });
        await instance.deleteAccount('1234');
        expect(mockDeleteAccountDetails).toBeCalled();
        expect(mockMoveAccount).toBeCalled();
        const deleteAccountRequest = mockDeleteAccountDetails.mock.calls[0][0];
        expect(deleteAccountRequest).toEqual('1234');
        const moveAccountsRequest = mockMoveAccount.mock.calls[0][0];
        expect(moveAccountsRequest).toEqual({
            AccountId: '1234',
            DestinationParentId: 'fakeSuspendedOu',
            SourceParentId: 'ou-org-1',
        });
    });

    it('deleteAccount: happy path and deleteAccountInControlTower is disabled', async () => {
        instance = new AccountsService(
            false,
            false,
            'fakeSuspendedOu',
            'fakeOwner',
            'fakeProductName',
            mockedAccountsDao,
            mockedOrganizationalUnitsDao,
            new AccountsAssembler(),
            mockedServiceCatalogFactory,
            mockedOrganizationsFactory,
        );
        const mockDeleteAccountDetails = (mockedAccountsDao.deleteAccount = jest.fn());
        const mockMoveAccount = (mockedOrganizations.moveAccount = jest.fn());
        mockMoveAccount.mockReturnValue({ promise: () => Promise.resolve() });
        await instance.deleteAccount('1234');
        expect(mockMoveAccount).not.toHaveBeenCalled();
        expect(mockDeleteAccountDetails).toBeCalled();
        const deleteAccountRequest = mockDeleteAccountDetails.mock.calls[0][0];
        expect(deleteAccountRequest).toEqual('1234');
    });
});
