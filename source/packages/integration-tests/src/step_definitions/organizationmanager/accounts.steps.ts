import { AccountResource, AccountsService, ORGMANLIBRARY_CLIENT_TYPES } from "@cdf/organizationmanager-client";
import { fail } from "assert";
import { expect } from "chai";
import { Given, DataTable, Then, When } from "@cucumber/cucumber";
import { container } from "../../di/inversify.config";
import { buildModel, validateExpectedAttributes } from "../common/common.steps";
import { getAdditionalHeaders, world } from "./organizationalManager.world";

const accountsService: AccountsService = container.get(ORGMANLIBRARY_CLIENT_TYPES.AccountsService);

Given('account {string} does not exists', async function (accountId: string) {
    try {
        await accountsService.getAccount(accountId, getAdditionalHeaders(world))
        expect.fail('Not found should have be thrown')
    } catch (err) {
        expect(err.status).to.eq(404);
    }
});

When('I create account with attributes', async function (data: DataTable) {
    delete world.lastAccountId;
    try {
        const account: AccountResource = buildModel(data);
        world.lastAccountId = await accountsService.createAccount(account, getAdditionalHeaders(world));
    } catch (err) {
        world.errStatus = err.status;
    }
});

Given('account {string} associated with organizational unit {string}', async function (accountId: string, organizationalUnitId: string) {
    const accounts = await accountsService.listAccounts(organizationalUnitId);
    expect(accounts.accounts.find(o => o.accountId === accountId), `${accountId} not associated with ${organizationalUnitId}`).to.not.equal(undefined)
});

Then('last account creation fails with a {int}', function (status: number) {
    expect(world.errStatus, 'response').eq(status);
});

Then('last account exists with attributes', async function (data: DataTable) {
    let account: AccountResource;
    try {
        account = await accountsService.getAccount(world.lastAccountId, getAdditionalHeaders(world))
    } catch (err) {
        world.errStatus = err.status;
        fail(`getAccount failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(account, data)
});