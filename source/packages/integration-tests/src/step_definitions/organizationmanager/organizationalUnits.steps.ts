import { Given, DataTable, Then, When } from '@cucumber/cucumber';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import {
    OrganizationalUnitResource,
    OrganizationalUnitsService,
    ORGMANLIBRARY_CLIENT_TYPES,
} from '@awssolutions/cdf-organizationmanager-client';
import { container } from '../../di/inversify.config';
import { world, getAdditionalHeaders } from './organizationalManager.world';
import { expect } from 'chai';
import { fail } from 'assert';

const organizationalUnitService: OrganizationalUnitsService = container.get(
    ORGMANLIBRARY_CLIENT_TYPES.OrganizationalUnitsService
);

Given('organizational unit {string} exists', async function (organizationalUnitId: string) {
    const organizationalUnit = await organizationalUnitService.getOrganizationalUnit(
        organizationalUnitId,
        getAdditionalHeaders(world)
    );
    expect(organizationalUnit.id).equal(organizationalUnitId);
});

Given(
    'organizational unit {string} does not exists',
    async function (organizationalUnitId: string) {
        try {
            await organizationalUnitService.getOrganizationalUnit(
                organizationalUnitId,
                getAdditionalHeaders(world)
            );
            expect.fail('Not found should have be thrown');
        } catch (err) {
            expect(err.status).to.eq(404);
        }
    }
);

Then('last organizationalUnit exists with attributes', async function (data: DataTable) {
    let organizationalUnit: OrganizationalUnitResource;
    try {
        organizationalUnit = await organizationalUnitService.getOrganizationalUnit(
            world.lastOrganizationalUnitId,
            getAdditionalHeaders(world)
        );
    } catch (err) {
        world.errStatus = err.status;
        fail(`getOrganizationalUnit failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(organizationalUnit, data);
});

When('I create organizationalUnit with attributes', async function (data: DataTable) {
    delete world.lastOrganizationalUnitId;
    try {
        const organizationalUnitResource: OrganizationalUnitResource = buildModel(data);
        world.lastOrganizationalUnitId = await organizationalUnitService.createOrganizationalUnit(
            organizationalUnitResource,
            getAdditionalHeaders(world)
        );
    } catch (err) {
        world.errStatus = err.status;
        fail(`createOrganizationalUnit failed, err: ${JSON.stringify(err)}`);
    }
});

When('I delete organizationalUnit {string}', async function (organizationalUnitId: string) {
    try {
        await organizationalUnitService.deleteOrganizationalUnit(organizationalUnitId);
    } catch (err) {
        world.errStatus = err.status;
    }
});

Then('last organizational unit deletion fails with a {int}', function (status: number) {
    expect(world.errStatus, 'response').eq(status);
});
