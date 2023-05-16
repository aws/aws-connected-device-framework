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
    OrganizationalUnitsService,
    OrganizationalUnitResource,
    ORGMANLIBRARY_CLIENT_TYPES,
    AccountsService,
} from '@aws-solutions/cdf-organizationmanager-client';
import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import { container } from '../di/inversify.config';

setDefaultTimeout(30 * 1000);

const testOrganizationalUnits: OrganizationalUnitResource[] = [
    {
        id: 'ou-12345',
        name: 'first ou',
    },
    {
        id: 'ou-99999',
        name: 'second ou',
    },
];

const organizationalUnitsWithComponents: OrganizationalUnitResource[] = [
    {
        id: 'ou-55555',
        name: 'third ou',
        tags: {
            createBy: 'cdf',
        },
    },
    {
        id: 'ou-66666',
        name: 'fourth ou',
        tags: {
            createBy: 'cdf',
        },
    },
];

const testAccounts = ['22222', '33333', '44444'];

const organizationalUnitService: OrganizationalUnitsService = container.get(
    ORGMANLIBRARY_CLIENT_TYPES.OrganizationalUnitsService
);
const accountsService: AccountsService = container.get(ORGMANLIBRARY_CLIENT_TYPES.AccountsService);

async function tearDown() {
    for (const account of testAccounts) {
        await accountsService.deleteAccount(account).catch((_err) => {
            console.log('error');
        });
    }
    for (const ou of testOrganizationalUnits) {
        await organizationalUnitService.deleteOrganizationalUnit(ou.id).catch((_err) => {
            console.log('error');
        });
    }
    for (const ou of organizationalUnitsWithComponents) {
        await organizationalUnitService.deleteOrganizationalUnit(ou.id).catch((_err) => {
            console.log('error');
        });
    }
}

Before({ tags: '@setup_organizationmanager_feature' }, async function () {
    await tearDown();
    for (const ou of organizationalUnitsWithComponents) {
        await organizationalUnitService.createOrganizationalUnit(ou);
    }
});

Before({ tags: '@teardown_organizationmanager_feature' }, async function () {
    await tearDown();
});
