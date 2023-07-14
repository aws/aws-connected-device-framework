/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import {
    AccountResource,
    AccountCreationRequest,
    AccountUpdateRequest,
    AccountComponentModel,
    AccountRegionUpdateRequest,
    AccountListPaginationKey,
    AccountsItem,
} from './accounts.models';
import ow from 'ow';
import { ProvisionProductInput } from 'aws-sdk/clients/servicecatalog';
import { AccountsDao } from './accounts.dao';
import { AccountsAssembler } from './accounts.assembler';
import { ComponentResourceList } from '../components/components.model';
import { OrganizationalUnitsDao } from '../organizationalUnits/organizationalUnits.dao';
import { owCheckUnprintableChar, owCheckOversizeString } from '../utils/inputValidation.util';

@injectable()
export class AccountsService {
    private _serviceCatalog: AWS.ServiceCatalog;
    private _organizations: AWS.Organizations;

    constructor(
        @inject('featureToggle.accounts.create')
        private createAccountInControlTower: boolean,
        @inject('featureToggle.accounts.delete')
        private deleteAccountInControlTower: boolean,
        @inject('aws.organizations.suspendedOU') private suspendedOU: string,
        @inject('aws.servicecatalog.product.owner')
        private accountFactoryProductOwner: string,
        @inject('aws.servicecatalog.product.name')
        private accountFactoryProductName: string,
        @inject(TYPES.AccountsDao) private accountsDao: AccountsDao,
        @inject(TYPES.OrganizationalUnitsDao)
        private organizationalUnitsDao: OrganizationalUnitsDao,
        @inject(TYPES.AccountsAssembler)
        private accountsAssembler: AccountsAssembler,
        @inject(TYPES.ServiceCatalogFactory)
        serviceCatalogFactory: () => AWS.ServiceCatalog,
        @inject(TYPES.OrganizationsFactory)
        organizationsFactory: () => AWS.Organizations,
    ) {
        this._serviceCatalog = serviceCatalogFactory();
        this._organizations = organizationsFactory();
    }

    public async deleteAccount(accountId: string): Promise<void> {
        logger.debug(`accounts.service delete: in: account: ${accountId}`);

        ow(accountId, ow.string.nonEmpty);

        const accountResource = await this.getAccountById(accountId);

        const { organizationalUnitId, status } = accountResource;

        ow(status, ow.string.oneOf(['ACTIVE', 'PROVISIONED', 'FAILED', 'SUSPENDED']));

        if (this.deleteAccountInControlTower) {
            logger.debug(
                `accounts.service delete: in: moving account ${accountId} from ${organizationalUnitId} to ${this.suspendedOU}`,
            );
            await this._organizations
                .moveAccount({
                    AccountId: accountResource.accountId,
                    SourceParentId: accountResource.organizationalUnitId,
                    DestinationParentId: this.suspendedOU,
                })
                .promise();
        }
        await this.accountsDao.deleteAccount(accountId);

        logger.debug(`accounts.service delete: exit`);
    }

    public async areAllComponentsDeployed(
        accountId: string,
        components: ComponentResourceList,
    ): Promise<boolean> {
        logger.debug(
            `accounts.service areAllComponentsDeployed: in: accountId:${accountId}, components:${JSON.stringify(
                components,
            )}`,
        );

        ow(accountId, ow.string.nonEmpty);
        ow(components, ow.array.nonEmpty);

        const requireComponentsToCheck = components.filter((o) => !o.bypassCheck);

        if (requireComponentsToCheck.length < 1) return true;

        const accountResource = await this.getAccountById(accountId);

        const { regions } = accountResource;

        const deployedComponents = (
            await this.accountsDao.listComponentsByAccount(accountId)
        ).filter((o) => o.status === 'CREATED');

        let allComponentsAreDeployed = true;

        for (const componentToCheck of requireComponentsToCheck) {
            for (const regionToCheck of regions) {
                if (
                    deployedComponents.find(
                        (o) =>
                            o.componentName === componentToCheck.name &&
                            o.region === regionToCheck,
                    ) === undefined
                ) {
                    allComponentsAreDeployed = false;
                    break;
                }
            }
        }

        logger.debug(
            `accounts.service areAllComponentsDeployed: exit: allComponentsAreDeployed: ${allComponentsAreDeployed}`,
        );
        return allComponentsAreDeployed;
    }

    public async updateComponentByAccount(request: AccountComponentModel): Promise<void> {
        logger.debug(
            `accounts.service updateComponentStatus: in: request:${JSON.stringify(request)}`,
        );

        const { accountId, componentName, status, region } = request;

        ow(accountId, ow.string.nonEmpty);
        ow(componentName, ow.string.nonEmpty);
        ow(status, ow.string.nonEmpty);
        ow(region, ow.string.nonEmpty);

        await this.accountsDao.updateComponentByAccount(request);

        logger.debug(`accounts.service updateComponentStatus: exit: `);
    }

    public async getAccountById(accountId: string): Promise<AccountResource | undefined> {
        logger.debug(`accounts.service getAccountById: in: accountId : ${accountId}`);

        ow(accountId, ow.string.nonEmpty);

        const accountItem = await this.accountsDao.getAccountById(accountId);

        if (accountItem === undefined) {
            return undefined;
        }

        const accountResource = this.accountsAssembler.toResource(accountItem);

        logger.debug(
            `accounts.service getAccountById: out: account : ${JSON.stringify(accountResource)}`,
        );

        return accountResource;
    }

    public async getAccountsInOu(
        ouName: string,
        count?: number,
        exclusiveStart?: AccountListPaginationKey,
    ): Promise<[AccountsItem[], AccountListPaginationKey]> {
        logger.debug(`accounts.service getAccountsInOu: in: ouName : ${ouName}`);

        ow(ouName, ow.string.nonEmpty);

        const result = await this.accountsDao.getAccountsInOu(ouName, count, exclusiveStart);

        logger.debug(`accounts.service getAccountsInOu: out: result : ${JSON.stringify(result)}`);

        return result;
    }

    public async getAccountByName(accountName: string): Promise<AccountResource | undefined> {
        logger.debug(`accounts.service getAccountByName: in: account : ${accountName}`);

        ow(accountName, ow.string.nonEmpty);

        const accountItem = await this.accountsDao.getAccountByName(accountName);

        if (accountItem === undefined) {
            throw new Error('NOT_FOUND');
        }

        const accountResource = this.accountsAssembler.toResource(accountItem);

        logger.debug(
            `accounts.service getAccountByName: out: account : ${JSON.stringify(accountResource)}`,
        );

        return accountResource;
    }

    private async convertRequestToServiceCatalogParameter(
        request: AccountCreationRequest,
    ): Promise<ProvisionProductInput> {
        const searchProductsAsAdminResponse = await this._serviceCatalog
            .searchProductsAsAdmin({
                Filters: { Owner: [this.accountFactoryProductOwner] },
            })
            .promise();
        const productId = searchProductsAsAdminResponse.ProductViewDetails.find(
            (o) => o.ProductViewSummary.Name === this.accountFactoryProductName,
        )?.ProductViewSummary?.ProductId;

        if (productId === undefined) {
            throw new Error('no control tower product exists in this account');
        }

        const listProvisioningArtifactsResponse = await this._serviceCatalog
            .listProvisioningArtifacts({ ProductId: productId })
            .promise();
        // This is the way the product is being versioned, we want to make sure we're using the active provisioning artifact
        const provisioningArtifactId =
            listProvisioningArtifactsResponse.ProvisioningArtifactDetails.find((o) => o.Active)
                ?.Id;

        if (provisioningArtifactId === undefined) {
            throw new Error(
                'no active control tower service catalog product exists in this account',
            );
        }

        const {
            ssoEmail,
            ssoFirstName,
            ssoLastName,
            createAccountRequestId: createRequestToken,
            name: accountName,
            email: accountEmail,
            organizationalUnitId: organizationalUnit,
        } = request;

        return {
            ProductId: productId,
            ProvisioningArtifactId: provisioningArtifactId,
            ProvisionToken: createRequestToken,
            ProvisionedProductName: `${accountName}`,
            ProvisioningParameters: [
                {
                    Key: 'AccountEmail',
                    Value: accountEmail,
                },
                {
                    Key: 'ManagedOrganizationalUnit',
                    Value: organizationalUnit,
                },
                {
                    Key: 'AccountName',
                    Value: accountName,
                },
                {
                    Key: 'SSOUserEmail',
                    Value: ssoEmail,
                },
                {
                    Key: 'SSOUserFirstName',
                    Value: ssoFirstName,
                },
                {
                    Key: 'SSOUserLastName',
                    Value: ssoLastName,
                },
            ],
        };
    }

    public async updateAccountStatus(updateModel: AccountUpdateRequest): Promise<void> {
        logger.debug(
            `accounts.service updateAccountStatus: in: updateModel:${JSON.stringify(updateModel)}`,
        );

        ow(updateModel, ow.object.nonEmpty);
        ow(updateModel.organizationalUnitId, ow.string.nonEmpty);
        ow(updateModel.name, ow.string.nonEmpty);
        ow(updateModel.status, ow.string.nonEmpty);
        ow(updateModel.accountId, ow.string.nonEmpty);

        const { name, accountId, organizationalUnitId, status } = updateModel;

        await this.accountsDao.updateAccount({
            name,
            organizationalUnitId,
            status,
        });

        if (status === 'ACTIVE') {
            const accountResource = await this.getAccountByName(name);
            const { regions } = accountResource;
            await this.accountsDao.updateRegionsMappingForAccount(
                organizationalUnitId,
                accountId,
                regions,
            );
        }

        logger.debug(`accounts.service updateAccountStatus: exit:`);
    }

    public async updateAccountRegions(updateModel: AccountRegionUpdateRequest): Promise<void> {
        logger.debug(
            `accounts.service updateAccountRegions: in: updateModel:${JSON.stringify(
                updateModel,
            )}`,
        );

        ow(updateModel, ow.object.nonEmpty);
        ow(updateModel.accountId, ow.string.nonEmpty);
        ow(updateModel.regions, ow.array.nonEmpty);

        const { regions, accountId } = updateModel;
        const accountResource = await this.getAccountById(accountId);
        const { organizationalUnitId, name } = accountResource;
        await this.accountsDao.updateAccount({
            name,
            organizationalUnitId,
            regions,
        });
        await this.accountsDao.updateRegionsMappingForAccount(
            organizationalUnitId,
            accountId,
            regions,
        );

        logger.debug(`accounts.service updateAccountRegions: exit:`);
    }

    public async createAccount(account: AccountCreationRequest): Promise<AccountResource> {
        logger.debug(`accounts.service createAccount: in: account :${JSON.stringify(account)}`);

        ow(account, ow.object.nonEmpty);
        ow(account.email, ow.string.nonEmpty);
        ow(account.name, ow.string.nonEmpty);
        ow(account.ssoEmail, ow.string.nonEmpty);
        ow(account.ssoFirstName, ow.string.nonEmpty);
        ow(account.ssoLastName, ow.string.nonEmpty);
        ow(account.organizationalUnitId, ow.string.nonEmpty);
        owCheckOversizeString(account.organizationalUnitId, 2048, 'account.organizationalUnitId');
        owCheckOversizeString(account.accountId, 2048, 'account.accountId');
        ow(account.regions, ow.array.nonEmpty);
        ow(account.regions, ow.array.minLength(1));
        ow(account.regions, ow.array.maxLength(40));

        const { createAccountRequestId, accountId, tags, ...accountItem } = account;

        let accountResource;

        const organizationalUnitIds = (
            await this.organizationalUnitsDao.getOrganizationalUnits()
        ).map((ou) => ou.id);

        if (!organizationalUnitIds.includes(account.organizationalUnitId)) {
            throw new Error('FAILED_VALIDATION');
        }

        if (this.createAccountInControlTower) {
            ow(createAccountRequestId, ow.string.nonEmpty);
            ow(tags, ow.object.nonEmpty);
            const provisionProductRequest = await this.convertRequestToServiceCatalogParameter(
                account,
            );
            await this._serviceCatalog.provisionProduct(provisionProductRequest).promise();
            accountResource = await this.accountsDao.createAccount({
                ...accountItem,
                accountId,
                status: 'CREATING',
            });
        } else {
            ow(accountId, ow.string.nonEmpty);
            owCheckUnprintableChar(accountId, 'accountId');
            owCheckOversizeString(accountId, 2048, 'accountId');
            accountResource = await this.accountsDao.createAccount({
                ...accountItem,
                accountId,
                status: 'ACTIVE',
            });
            await this.accountsDao.updateRegionsMappingForAccount(
                account.organizationalUnitId,
                accountId,
                account.regions,
            );
        }

        logger.debug(`accounts.service createAccount: out: accountResource:${accountResource}`);
        return accountResource;
    }
}
