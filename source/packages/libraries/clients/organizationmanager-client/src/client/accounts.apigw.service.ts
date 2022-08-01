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

/* tslint:disable:no-unused-variable member-ordering */
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { AccountsService, AccountsServiceBase } from './accounts.service';
import { AccountResource, AccountCreationRequest, AccountResourceList } from './accounts.model';
import { RequestHeaders } from './common.model';

@injectable()
export class AccountsApigwService extends AccountsServiceBase implements AccountsService {

    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ORGANIZATIONMANAGER_BASE_URL;
    }
    async getAccount(accountId: string, additionalHeaders?: RequestHeaders): Promise<AccountResource> {
        const url = `${this.baseUrl}${super.accountRelativeUrl(accountId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listAccounts(organizationalUnitId: string, additionalHeaders?: RequestHeaders): Promise<AccountResourceList> {
        const url = `${this.baseUrl}${super.accountsInOrganizationalUnitRelativeUrl(organizationalUnitId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async createAccount(account: AccountCreationRequest, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(account, ow.object.nonEmpty);
        ow(account.organizationalUnitId, ow.string.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.accountsInOrganizationalUnitRelativeUrl(account.organizationalUnitId)}`)
            .set(this.buildHeaders(additionalHeaders))
            .send(account);

        const location = res.get('Location');
        return location.substring(location.lastIndexOf('/') + 1);
    }
    async deleteAccount(accountId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(accountId, ow.string.nonEmpty);
        await request.delete(`${this.baseUrl}${super.accountRelativeUrl(accountId)}`)
            .set(this.buildHeaders(additionalHeaders))
    }
}
