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
import { inject, injectable } from 'inversify';
import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import {
    AccountsItem,
    AccountComponentModel,
    AccountResource,
    AccountUpdateRequest,
    DynamoDbPaginationKey,
    AccountListPaginationKey,
} from './accounts.models';
import {
    createDelimitedAttribute,
    createDelimitedAttributePrefix,
    expandDelimitedAttribute,
    PkType,
} from '../utils/pkUtils.util';
import AWS = require('aws-sdk');
import { TransactWriteItemList, Update } from 'aws-sdk/clients/dynamodb';
@injectable()
export class AccountsDao {
    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamodb.tables.accounts') private accountsTable: string,
        @inject('aws.dynamodb.tables.gsi1') private accountsTableGsi1: string,
        @inject('aws.dynamodb.tables.gsi2') private accountsTableGsi2: string,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient,
    ) {
        this._dc = documentClientFactory();
    }

    private createOrganizationalUnitsRegionMappingItems(
        organizationalUnit: string,
        regions: string[],
        accountId: string,
    ): AWS.DynamoDB.DocumentClient.TransactWriteItemList {
        return regions.map((region) => {
            return {
                Put: {
                    TableName: this.accountsTable,
                    Item: {
                        pk: createDelimitedAttribute(
                            PkType.OrganizationalUnits,
                            organizationalUnit,
                        ),
                        sk: createDelimitedAttribute(PkType.Region, ...[accountId, region]),
                        accountId: accountId,
                    },
                },
            };
        });
    }

    public async getAccountById(accountId: string): Promise<AccountsItem> {
        logger.debug(`accounts.dao getAccountById: in: accountId ${accountId}`);
        const getAccountResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                IndexName: this.accountsTableGsi2,
                KeyConditionExpression: 'gsi2Key = :gsi2Key and  begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':gsi2Key': createDelimitedAttributePrefix(PkType.Accounts, accountId),
                    ':sk': PkType.OrganizationalUnits,
                },
            })
            .promise();

        if (getAccountResponse.Items.length === 0) {
            logger.debug('accounts.dao getAccount: exit: undefined');
            return undefined;
        }

        const item = AccountsDao.assembleAccount(getAccountResponse.Items[0]);
        logger.debug(`accounts.dao getAccount: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public async getAccountByName(accountName: string): Promise<AccountsItem> {
        logger.debug(`accounts.dao getAccountByName: in: accountName ${accountName}`);
        const getAccountResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                KeyConditionExpression: 'pk = :pk and  begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':pk': createDelimitedAttributePrefix(PkType.Accounts, accountName),
                    ':sk': PkType.OrganizationalUnits,
                },
            })
            .promise();

        if (getAccountResponse.Items.length === 0) {
            logger.debug('accounts.dao getAccount: exit: undefined');
            return undefined;
        }

        const item = AccountsDao.assembleAccount(getAccountResponse.Items[0]);
        logger.debug(`accounts.dao getAccountByName: exit: ${JSON.stringify(item)}`);
        return item;
    }

    private static assembleAccounts(result: AWS.DynamoDB.DocumentClient.ItemList): AccountsItem[] {
        logger.debug(`accounts.dao assembleAccounts: in: result: ${JSON.stringify(result)}`);

        const accountItems = [];

        for (const item of result) {
            const accountItem = this.assembleAccount(item);
            accountItems.push(accountItem);
        }

        logger.debug(`accounts.dao assembleAccount: exit: ${JSON.stringify(accountItems)}`);
        return accountItems;
    }

    private static assembleAccount(
        result: AWS.DynamoDB.DocumentClient.AttributeMap,
    ): AccountsItem {
        logger.debug(`accounts.dao assembleAccount: in: result: ${JSON.stringify(result)}`);
        const { pk, sk, status, regions, gsi2Key, email, ssoEmail, ssoFirstName, ssoLastName } =
            result;
        let accountId;
        const pkElements = pk.split(':');
        const skElements = sk.split(':');
        if (gsi2Key !== undefined) {
            const gsi2Elements = gsi2Key.split(':');
            accountId = gsi2Elements[1];
        }

        const item: AccountsItem = {
            name: pkElements[1],
            organizationalUnitId: skElements[1],
            email,
            accountId,
            ssoEmail,
            ssoFirstName,
            ssoLastName,
            regions,
            status,
        };
        logger.debug(`accounts.dao assembleAccount: exit: ${JSON.stringify(item)}`);
        return item;
    }

    private static assembleComponentsDeploymentStatus(
        result: AWS.DynamoDB.DocumentClient.ItemList,
    ): AccountComponentModel[] {
        logger.debug(
            `accounts.dao assembleComponentsDeploymentStatus: in: result: ${JSON.stringify(
                result,
            )}`,
        );
        const componentDeploymentStatus: AccountComponentModel[] = [];
        for (const item of result) {
            const { pk, sk, status } = item;
            const pkElements = pk.split(':');
            const skElements = sk.split(':');
            componentDeploymentStatus.push({
                status,
                accountId: pkElements[1],
                region: skElements[1],
                componentName: skElements[2],
            });
        }

        logger.debug(
            `accounts.dao assembleComponentsDeploymentStatus: exit: ${JSON.stringify(
                componentDeploymentStatus,
            )}`,
        );
        return componentDeploymentStatus;
    }

    public async listComponentsByAccount(accountId: string): Promise<AccountComponentModel[]> {
        logger.debug(`accounts.dao listComponentsByAccount: in accountId:${accountId}`);
        const queryResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                IndexName: this.accountsTableGsi2,
                KeyConditionExpression: 'gsi2Key = :gsi2Key and begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':gsi2Key': createDelimitedAttributePrefix(PkType.Accounts, accountId),
                    ':sk': PkType.Components,
                },
            })
            .promise();

        if (queryResponse.Items === undefined || queryResponse.Items.length === 0) {
            return [];
        }
        const componentDeploymentStatusList = AccountsDao.assembleComponentsDeploymentStatus(
            queryResponse.Items,
        );
        logger.debug(
            `accounts.dao listComponentsByAccount: exit componentDeploymentStatusList:${JSON.stringify(
                componentDeploymentStatusList,
            )}`,
        );
        return componentDeploymentStatusList;
    }

    public async updateComponentByAccount(request: AccountComponentModel): Promise<void> {
        logger.debug(
            `accounts.dao updateComponentByAccount: in request:${JSON.stringify(request)}`,
        );

        const { region, accountId, componentName, status } = request;

        const account = await this.getAccountById(accountId);

        await this._dc
            .put({
                TableName: this.accountsTable,
                Item: {
                    pk: createDelimitedAttribute(PkType.Accounts, account.name),
                    sk: createDelimitedAttribute(PkType.Components, region, componentName),
                    gsi2Key: createDelimitedAttributePrefix(PkType.Accounts, accountId),
                    status,
                },
            })
            .promise();
        logger.debug(`accounts.dao updateComponentByAccount: exit`);
    }

    public async updateRegionsMappingForAccount(
        organizationalUnitId: string,
        accountId: string,
        regions: string[],
    ): Promise<void> {
        logger.debug(
            `accounts.dao deleteRegionsMappingForAccount: in organizationalUnitId:${organizationalUnitId} accountId:${accountId}`,
        );
        const queryResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                KeyConditionExpression: 'pk = :pk and begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':pk': createDelimitedAttributePrefix(
                        PkType.OrganizationalUnits,
                        organizationalUnitId,
                    ),
                    ':sk': createDelimitedAttributePrefix(PkType.Region, accountId),
                },
            })
            .promise();

        if (queryResponse.Items.length > 0) {
            logger.debug(
                `accounts.dao deleteRegionsMappingForAccount: queryResponse: ${JSON.stringify(
                    queryResponse,
                )}`,
            );
            await this._dc
                .batchWrite({
                    RequestItems: {
                        [this.accountsTable]: queryResponse.Items.map((item) => {
                            return {
                                DeleteRequest: {
                                    Key: {
                                        sk: item['sk'],
                                        pk: item['pk'],
                                    },
                                },
                            };
                        }),
                    },
                })
                .promise();
        }

        const regionSortedList = regions.sort();

        await this._dc
            .transactWrite({
                TransactItems: [
                    ...this.createOrganizationalUnitsRegionMappingItems(
                        organizationalUnitId,
                        regionSortedList,
                        accountId,
                    ),
                ],
            })
            .promise();

        logger.debug(`accounts.dao deleteRegionsMappingForAccount: exit`);
    }

    public async updateAccount(updateRequest: AccountUpdateRequest): Promise<void> {
        logger.debug(`accounts.dao updateAccount: in: model:${JSON.stringify(updateRequest)}`);

        const { name, organizationalUnitId, ...accountProperties } = updateRequest;

        const transactItems: TransactWriteItemList = [];

        const params = {
            TableName: this.accountsTable,
            Key: {
                pk: createDelimitedAttribute(PkType.Accounts, name),
                sk: createDelimitedAttribute(PkType.OrganizationalUnits, organizationalUnitId),
            },
            UpdateExpression: '',
            ExpressionAttributeValues: {},
            ExpressionAttributeNames: {},
        };

        Object.keys(accountProperties).forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(accountProperties, k)) {
                if (params.UpdateExpression === '') {
                    params.UpdateExpression += 'set ';
                } else {
                    params.UpdateExpression += ', ';
                }
                if (k === 'accountId') {
                    k = 'gsi2Key';
                }

                if (k === 'status') {
                    params.UpdateExpression += `#${k} = :${k}`;
                    params.ExpressionAttributeValues[`:${k}`] = accountProperties[k];
                    params.ExpressionAttributeNames[`#${k}`] = k;
                } else {
                    params.UpdateExpression += `${k} = :${k}`;
                    params.ExpressionAttributeValues[`:${k}`] = accountProperties[k];
                }
            }
        });

        if (params.UpdateExpression !== '') {
            if (Object.keys(params.ExpressionAttributeNames).length === 0) {
                delete params['ExpressionAttributeNames'];
            }
            transactItems.push({ Update: params as unknown as Update });
        }

        await this._dc
            .transactWrite({
                TransactItems: transactItems,
            })
            .promise();

        logger.debug(`accounts.dao updateAccount: exit:`);
    }

    public async deleteAccount(accountId: string): Promise<void> {
        logger.debug(`accounts.dao delete: in: accountId:${accountId}`);

        const accountItem = await this.getAccountById(accountId);

        if (accountItem === undefined) {
            throw new Error('NOT_FOUND');
        }

        const { organizationalUnitId: organizationalUnit } = accountItem;
        const deleteRegionMappings =
            accountItem.regions === undefined
                ? []
                : accountItem.regions?.map((region) => {
                      return {
                          Delete: {
                              TableName: this.accountsTable,
                              Key: {
                                  pk: createDelimitedAttribute(
                                      PkType.OrganizationalUnits,
                                      organizationalUnit,
                                  ),
                                  sk: createDelimitedAttribute(
                                      PkType.Region,
                                      region,
                                      accountItem.name,
                                  ),
                              },
                          },
                      };
                  });

        await this._dc
            .transactWrite({
                TransactItems: [
                    {
                        Delete: {
                            TableName: this.accountsTable,
                            Key: {
                                pk: createDelimitedAttribute(PkType.Accounts, accountItem.name),
                                sk: createDelimitedAttribute(
                                    PkType.OrganizationalUnits,
                                    organizationalUnit,
                                ),
                            },
                        },
                    },
                    ...deleteRegionMappings,
                ],
            })
            .promise();

        logger.debug(`accounts.dao delete: exit`);
    }

    public async getAccountsInOu(
        ouName: string,
        count?: number,
        exclusiveStart?: AccountListPaginationKey,
    ): Promise<[AccountsItem[], AccountListPaginationKey]> {
        logger.debug(`accounts.dao getAccountsInOU: in: ouName:${ouName}`);

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.organizationalUnitId && exclusiveStart?.accountName) {
            exclusiveStartKey = {
                sk: createDelimitedAttribute(
                    PkType.OrganizationalUnits,
                    exclusiveStart.organizationalUnitId,
                ),
                pk: createDelimitedAttribute(PkType.Accounts, exclusiveStart.accountName),
            };
        }

        const queryResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                IndexName: this.accountsTableGsi1,
                KeyConditionExpression: 'sk = :sk and begins_with(pk,:pk)',
                ExpressionAttributeValues: {
                    ':sk': createDelimitedAttributePrefix(PkType.OrganizationalUnits, ouName),
                    ':pk': PkType.Accounts,
                },
                ExclusiveStartKey: exclusiveStartKey,
                Limit: count,
            })
            .promise();

        if (queryResponse.Items === undefined || queryResponse.Items.length === 0) {
            return [[], null];
        }
        const result = AccountsDao.assembleAccounts(queryResponse.Items);

        let paginationKey: AccountListPaginationKey;
        if (queryResponse.LastEvaluatedKey) {
            const organizationalUnitId = expandDelimitedAttribute(
                queryResponse.LastEvaluatedKey.pk,
            )[1];
            const lastEvaluatedAccountName = expandDelimitedAttribute(
                queryResponse.LastEvaluatedKey.sk,
            )[1];
            paginationKey = {
                accountName: lastEvaluatedAccountName,
                organizationalUnitId: organizationalUnitId,
            };
        }

        logger.debug(
            `accounts.dao getAccountsInOu: exit: result: ${JSON.stringify(
                result,
            )}, paginationKey: ${JSON.stringify(paginationKey)}`,
        );
        return [result, paginationKey];
    }

    public async createAccount(item: AccountsItem): Promise<AccountResource> {
        logger.debug(`accounts.dao create: in: item:${JSON.stringify(item)}`);

        const {
            name: accountName,
            organizationalUnitId: organizationalUnit,
            accountId,
            ...rest
        } = item;

        await this._dc
            .put({
                TableName: this.accountsTable,
                Item: {
                    pk: createDelimitedAttribute(PkType.Accounts, accountName),
                    gsi2Key: accountId
                        ? createDelimitedAttribute(PkType.Accounts, accountId)
                        : undefined,
                    sk: createDelimitedAttribute(
                        PkType.OrganizationalUnits,
                        item.organizationalUnitId,
                    ),
                    ...rest,
                },
            })
            .promise();

        const accountResource: AccountResource = {
            ...item,
        };
        logger.debug(
            `accounts.dao create: exit: accountResource:${JSON.stringify(accountResource)}`,
        );
        return accountResource;
    }
}
