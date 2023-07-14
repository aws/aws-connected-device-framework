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

import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { AccountCreationRequest, AccountResource, AccountResourceList } from './accounts.model';
import { AccountsService, AccountsServiceBase } from './accounts.service';
import { RequestHeaders } from './common.model';

@injectable()
export class AccountsLambdaService extends AccountsServiceBase implements AccountsService {
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ORGANIZATIONMANAGER_API_FUNCTION_NAME;
    }

    async listAccounts(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<AccountResourceList> {
        ow(organizationalUnitId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.accountsInOrganizationalUnitRelativeUrl(organizationalUnitId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getAccount(
        accountId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<AccountResource> {
        ow(accountId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.accountRelativeUrl(accountId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
    async createAccount(
        account: AccountCreationRequest,
        additionalHeaders?: RequestHeaders,
    ): Promise<string> {
        ow(account, ow.object.nonEmpty);
        ow(account.accountId, ow.string.nonEmpty);
        ow(account.name, ow.string.nonEmpty);
        ow(account.regions, ow.array.nonEmpty);
        ow(account.organizationalUnitId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.accountsInOrganizationalUnitRelativeUrl(account.organizationalUnitId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(account);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.header['x-groupPath'];
    }

    async deleteAccount(accountId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(accountId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.accountRelativeUrl(accountId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
