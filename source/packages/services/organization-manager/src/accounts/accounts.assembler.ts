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

import { logger } from '@awssolutions/simple-cdf-logger';
import { injectable } from 'inversify';
import {
    AccountCreationRequest,
    AccountListPaginationKey,
    AccountResource,
    AccountResourceList,
    AccountStatus,
    AccountsItem,
} from './accounts.models';

@injectable()
export class AccountsAssembler {
    public toItem(
        resource: AccountResource | AccountCreationRequest,
        status: AccountStatus,
    ): AccountsItem {
        logger.debug(`accounts.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const { name, email, ssoEmail, regions, ssoFirstName, ssoLastName, organizationalUnitId } =
            resource;

        const accountId = resource['accountId'];
        const item: AccountsItem = {
            email,
            ssoEmail,
            regions,
            ssoLastName,
            ssoFirstName,
            accountId,
            name,
            organizationalUnitId,
            status,
        };

        logger.debug(`accounts.assembler toItem: out: ${JSON.stringify(item)}`);
        return item;
    }

    public toListResource(
        items: AccountsItem[],
        count?: number,
        paginateFrom?: AccountListPaginationKey,
    ): AccountResourceList {
        logger.debug(`accounts.assembler toResources: in: items:${JSON.stringify(items)}`);

        const list: AccountResourceList = {
            accounts: [],
        };

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                accountName: paginateFrom?.accountName,
                organizationId: paginateFrom?.organizationalUnitId,
            };
        }

        list.accounts = items.map((o) => this.toResource(o));

        logger.debug(`accounts.assembler toResources: out: ${JSON.stringify(list)}`);
        return list;
    }

    public toResource(item: AccountsItem): AccountResource {
        logger.debug(`accounts.assembler toResource: in: item:${JSON.stringify(item)}`);
        const {
            name,
            email,
            ssoEmail,
            regions,
            ssoFirstName,
            ssoLastName,
            organizationalUnitId,
            accountId,
            status,
        } = item;

        const resource: AccountResource = {
            email,
            name,
            ssoEmail,
            regions,
            ssoLastName,
            ssoFirstName,
            organizationalUnitId,
            status,
            accountId,
        };
        logger.debug(`accounts.assembler toResource: out: ${JSON.stringify(item)}`);
        return resource;
    }
}
