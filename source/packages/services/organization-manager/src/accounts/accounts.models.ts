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

export type AccountStatus =
    | 'CREATING'
    | 'ACTIVE'
    | 'PROVISIONED'
    | 'SUSPENDED'
    | 'PENDING'
    | 'ERROR';

export type ComponentStatus = 'CREATED' | 'UPDATED' | 'FAILED';

export interface AccountResource {
    accountId?: string;
    name: string;
    email: string;
    ssoEmail: string;
    ssoFirstName: string;
    ssoLastName: string;
    status: AccountStatus;
    organizationalUnitId: string;
    regions: string[];
    tags?: { [key: string]: string };
}

export type AccountResourceList = {
    accounts: AccountResource[];
    pagination?: {
        lastEvaluated?: {
            accountName: string;
            organizationId: string;
        };
        count?: number;
    };
};

export type AccountsItem = Omit<AccountResource, 'tags'>;

export type AccountComponentModel = {
    accountId: string;
    componentName: string;
    region: string;
    status: ComponentStatus;
};

export type AccountCreationRequest = Omit<AccountResource, 'status'> & {
    createAccountRequestId: string;
};

export type AccountUpdateRequest = {
    name: string;
    organizationalUnitId: string;
    status?: AccountStatus;
    regions?: string[];
    accountId?: string;
};

export type AccountRegionUpdateRequest = Pick<AccountResource, 'regions' | 'accountId'>;

export type AccountStatusUpdateRequest = Pick<AccountResource, 'status' | 'name'>;

export type ProvisionedAccountDetail = Pick<AccountResource, 'status' | 'accountId'>;

export type DynamoDbPaginationKey = { [key: string]: string };

export type AccountListPaginationKey = {
    organizationalUnitId: string;
    accountName: string;
};
