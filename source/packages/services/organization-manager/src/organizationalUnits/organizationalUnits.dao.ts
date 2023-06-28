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


import {inject, injectable} from "inversify";
import {TYPES} from "../di/types";
import {logger} from '@awssolutions/simple-cdf-logger';
import {createDelimitedAttribute, PkType} from "../utils/pkUtils.util";
import {OrganizationalUnitItem} from "./organizationalUnits.model";

@injectable()
export class OrganizationalUnitsDao {
    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamodb.tables.accounts') private accountsTable: string,
        @inject('aws.dynamodb.tables.gsi1') private accountsTableGsi1: string,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient,
    ) {
        this._dc = documentClientFactory();
    }

    public async getOrganizationalUnits(): Promise<OrganizationalUnitItem[]> {
        logger.debug(`organizationalUnits.dao getOrganizationalUnits: in:`);
        const getOrganizationalUnitResponse = await this._dc.query(
            {
                TableName: this.accountsTable,
                IndexName: this.accountsTableGsi1,
                KeyConditionExpression: 'begins_with(pk,:pk) and sk = :sk',
                ExpressionAttributeValues: {
                    ':pk': PkType.OrganizationalUnits,
                    ':sk': PkType.Details
                }
            }).promise()

        if (getOrganizationalUnitResponse.Items === undefined || getOrganizationalUnitResponse.Items.length === 0) {
            return [];
        }
        const itemList = OrganizationalUnitsDao.assembleOrganizationalUnits(getOrganizationalUnitResponse.Items);
        logger.debug(`organizationalUnits.dao getOrganizationalUnits: in: ouName:${itemList}`);
        return itemList;
    }

    public async getOrganizationalUnit(id: string): Promise<OrganizationalUnitItem> {
        logger.debug(`organizationalUnits.dao getOrganizationalUnit: in: id:${id}`);

        const getOrganizationalUnitResponse = await this._dc.get(
            {
                TableName: this.accountsTable,
                Key: {
                    pk: createDelimitedAttribute(PkType.OrganizationalUnits, id),
                    sk: PkType.Details,
                }

            }).promise()

        if (getOrganizationalUnitResponse.Item === undefined) {
            return undefined
        }
        const item = OrganizationalUnitsDao.assembleOrganizationalUnit(getOrganizationalUnitResponse.Item)
        logger.debug(`organizationalUnits.dao getOrganizationalUnit: exit: item: ${JSON.stringify(item)}`);
        return item;
    }

    public async getAccountsByOrganizationalUnit(id: string): Promise<string[]> {
        logger.debug(`organizationalUnits.dao getAccountsByOrganizationalUnit: in: id:${id}`);
        const queryResponse = await this._dc.query(
            {
                TableName: this.accountsTable,
                IndexName: this.accountsTableGsi1,
                KeyConditionExpression: 'sk = :sk and begins_with(pk,:pk)',
                ExpressionAttributeValues: {
                    ':pk': PkType.Accounts,
                    ':sk': createDelimitedAttribute(PkType.OrganizationalUnits, id),
                }
            }).promise()

        if (queryResponse.Items === undefined || queryResponse.Items.length == 0) {
            return []
        }

        const itemList = OrganizationalUnitsDao.assembleAccounts(queryResponse.Items);
        logger.debug(`organizationalUnits.dao create: exit: itemList: ${JSON.stringify(itemList)}`);
        return itemList;
    }

    public async deleteOrganizationalUnit(id: string): Promise<void> {
        logger.debug(`organizationalUnits.dao deleteOrganizationalUnit: in: id:${id}`);
        await this._dc.delete(
            {
                TableName: this.accountsTable,
                Key: {
                    pk: createDelimitedAttribute(PkType.OrganizationalUnits, id),
                    sk: PkType.Details,
                }

            }).promise()
        logger.debug(`organizationalUnits.dao deleteOrganizationalUnit: exit:`);
    }

    public async createOrganizationalUnit(item: OrganizationalUnitItem): Promise<void> {
        logger.debug(`organizationalUnits.dao createOrganizationalUnit: in: item:${JSON.stringify(item)}`);
        const {name, id, createdAt} = item;
        try {
            await this._dc.put(
                {
                    TableName: this.accountsTable,
                    Item: {
                        pk: createDelimitedAttribute(PkType.OrganizationalUnits, id),
                        gsi2Key: createDelimitedAttribute(PkType.OrganizationalUnits, name),
                        sk: PkType.Details,
                        createdAt
                    },
                    ConditionExpression: "attribute_not_exists(pk)"
                }).promise()
        } catch (error) {
            if (error.code === "ConditionalCheckFailedException") {
                throw new Error('Organizational Unit exists')
            } else {
                throw error
            }
        }

        logger.debug(`organizationalUnits.dao create: exit:`);
    }

    private static assembleAccounts(result: AWS.DynamoDB.DocumentClient.ItemList): string[] {
        logger.debug(`organizationalUnits.dao assembleAccounts: in: result: ${JSON.stringify(result)}`);
        const itemList = [];
        for (const item of result) {
            const {pk} = item;
            const pkElements = pk.split(':');
            itemList.push(pkElements[1]);
        }
        logger.debug(`organizationalUnits.dao assembleAccounts: exit: ${JSON.stringify(itemList)}`);
        return itemList;

    }

    private static assembleOrganizationalUnit(result: AWS.DynamoDB.DocumentClient.AttributeMap): OrganizationalUnitItem {
        logger.debug(`organizationalUnits.dao assembleOrganizationalUnit: in: result: ${JSON.stringify(result)}`);
        const {pk, gsi2Key, createdAt} = result

        const pkElements = pk.split(':');
        const gsi2KeyElements = gsi2Key.split(':');
        const item: OrganizationalUnitItem = {
            id: pkElements[1],
            name: gsi2KeyElements[1],
            createdAt
        }
        logger.debug(`organizationalUnits.dao assembleOrganizationalUnit: exit: ${JSON.stringify(item)}`);
        return item;

    }

    private static assembleOrganizationalUnits(result: AWS.DynamoDB.DocumentClient.ItemList): OrganizationalUnitItem[] {
        logger.debug(`organizationalUnits.dao assembleOrganizationalUnits: in: result: ${JSON.stringify(result)}`);
        const itemList = [];
        for (const item of result) {
            itemList.push(this.assembleOrganizationalUnit(item));
        }
        logger.debug(`organizationalUnits.dao assembleOrganizationalUnits: exit: ${JSON.stringify(itemList)}`);
        return itemList;

    }


}
