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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { PkType, createDelimitedAttributePrefix } from '../utils/pkUtils.util';
import { AccountsByRegionListMap, RegionListByOrganizationalUnitMap } from './manifest.model';
import AWS = require('aws-sdk');

@injectable()
export class ManifestDao {
    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamodb.tables.accounts') private accountsTable: string,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    private static assembleOrganizationalUnitRegionItem(
        result: AWS.DynamoDB.DocumentClient.ItemList
    ): AccountsByRegionListMap {
        logger.debug(
            `manifest.dao assembleOrganizationalUnitRegionItem: in: result: ${JSON.stringify(
                result
            )}`
        );
        const ouRegionItem = {};
        for (const item of result) {
            const { sk, accountId } = item;
            const skItems = sk.split(':');
            const region = skItems[2];
            if (ouRegionItem[region] === undefined) {
                ouRegionItem[region] = {
                    accounts: [],
                };
            }
            ouRegionItem[region].accounts.push(accountId);
        }

        logger.debug(
            `manifest.dao assembleOrganizationalUnitRegionItem: exit: ${JSON.stringify(
                ouRegionItem
            )}`
        );
        return ouRegionItem;
    }

    public async getRegionAccountForOus(
        ids: string[]
    ): Promise<RegionListByOrganizationalUnitMap> {
        const mapping = {};
        for (const id of ids) {
            mapping[id] = await this.getRegionAccountForOu(id);
        }
        return mapping;
    }

    public async getRegionAccountForOu(id: string): Promise<AccountsByRegionListMap> {
        logger.debug(`manifest.dao getOrganizationalUnitRegionItemList: in: id: ${id}`);
        const queryResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                KeyConditionExpression: 'pk = :pk and begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':pk': createDelimitedAttributePrefix(PkType.OrganizationalUnits, id),
                    ':sk': PkType.Region,
                },
            })
            .promise();

        if (queryResponse.Items === undefined || queryResponse.Items.length === 0) {
            return undefined;
        }
        const itemList = ManifestDao.assembleOrganizationalUnitRegionItem(queryResponse.Items);
        logger.debug(
            `templates.dao getOrganizationalUnitRegionItemList: exit: ${JSON.stringify(itemList)}`
        );
        return itemList;
    }
}
