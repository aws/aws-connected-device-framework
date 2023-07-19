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
import 'reflect-metadata';

import { Device20Resource, DevicesService } from '@awssolutions/cdf-assetlibrary-client';
import { ASSETLIBRARY_CLIENT_TYPES } from '@awssolutions/cdf-assetlibrary-client/dist';
import { DataTable, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import { fail } from 'assert';
import { expect, use } from 'chai';
import { Dictionary } from '../../../../libraries/core/lambda-invoke/src';
import { container } from '../../di/inversify.config';
import {
    AUTHORIZATION_TOKEN,
    RESPONSE_STATUS,
    replaceTokens,
    validateExpectedAttributes,
} from '../common/common.steps';

import chai_string = require('chai-string');
use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this

setDefaultTimeout(10 * 1000);

const deviceService: DevicesService = container.get(ASSETLIBRARY_CLIENT_TYPES.DevicesService);

function getAdditionalHeaders(world: unknown): Dictionary {
    const authCode = world[AUTHORIZATION_TOKEN];
    const headers = {
        authz: authCode,
        Accept: 'application/vnd.aws-cdf-v2.0+json',
        'Content-Type': 'application/vnd.aws-cdf-v2.0+json',
    };
    return headers;
}

Given('device {string} does not exist', async function (deviceId: string) {
    try {
        await deviceService.getDeviceByID(
            deviceId,
            undefined,
            undefined,
            undefined,
            getAdditionalHeaders(this)
        );
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('device {string} exists', async function (deviceId: string) {
    const device = await deviceService.getDeviceByID(
        deviceId,
        undefined,
        undefined,
        undefined,
        getAdditionalHeaders(this)
    );
    expect(device.deviceId).equalIgnoreCase(deviceId);
});

async function registerDevice(
    world: unknown,
    deviceId: string,
    data: DataTable,
    profileId?: string
) {
    const d = data.rowsHash();

    const device: Device20Resource = {
        deviceId,
        templateId: undefined,
    };

    Object.keys(d).forEach((key) => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            device[key] = JSON.parse(d[key]);
        } else if (value === '___null___') {
            device[key] = null;
        } else if (value === '___undefined___') {
            delete device[key];
        } else {
            device[key] = d[key];
        }
    });

    const headers = getAdditionalHeaders(world);
    await deviceService.createDevice(device, profileId, headers);
}

When(
    'I create device {string} with attributes',
    async function (deviceId: string, data: DataTable) {
        try {
            await registerDevice(this, deviceId, data);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I create device {string} applying profile {string} with attributes',
    async function (deviceId: string, profileId: string, data: DataTable) {
        try {
            await registerDevice(this, deviceId, data, profileId);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I create device {string} with invalid attributes',
    async function (deviceId: string, data: DataTable) {
        try {
            await registerDevice(this, deviceId, data);
            fail('Expected 400');
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
            expect(err.status).eq(400);
        }
    }
);

When(
    'I update device {string} with attributes',
    async function (deviceId: string, data: DataTable) {
        const d = data.rowsHash();

        const device: Device20Resource = {
            templateId: undefined,
        };

        Object.keys(d).forEach((key) => {
            const value = replaceTokens(d[key]);
            if (value.startsWith('{') || value.startsWith('[')) {
                device[key] = JSON.parse(d[key]);
            } else if (value === '___null___') {
                device[key] = null;
            } else if (value === '___undefined___') {
                delete device[key];
            } else {
                device[key] = d[key];
            }
        });

        try {
            await deviceService.updateDevice(
                deviceId,
                device,
                undefined,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I update device {string} applying profile {string}',
    async function (deviceId: string, profileId: string) {
        const device: Device20Resource = {
            deviceId,
            templateId: undefined,
        };

        try {
            await deviceService.updateDevice(
                deviceId,
                device,
                profileId,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I add device {string} to group {string} related via {string}',
    async function (deviceId: string, groupPath: string, relationship: string) {
        try {
            await deviceService.attachToGroup(
                deviceId,
                relationship,
                groupPath,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I remove device {string} from group {string} related via {string}',
    async function (deviceId: string, groupPath: string, relationship: string) {
        try {
            await deviceService.detachFromGroup(
                deviceId,
                relationship,
                groupPath,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I remove device {string} from groups related via {string}',
    async function (deviceId: string, relationship: string) {
        try {
            await deviceService.detachFromGroups(
                deviceId,
                relationship,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When('I remove device {string} from all groups', async function (deviceId: string) {
    try {
        await deviceService.detachFromAllGroups(deviceId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

When(
    'I remove device {string} from devices related via {string}',
    async function (deviceId: string, relationship: string) {
        try {
            await deviceService.detachFromDevices(
                deviceId,
                relationship,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When('I remove device {string} from all devices', async function (deviceId: string) {
    try {
        await deviceService.detachFromAllDevices(deviceId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

When('I delete device {string}', async function (deviceId: string) {
    try {
        await deviceService.deleteDevice(deviceId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

When('I get device {string}', async function (deviceId: string) {
    try {
        await deviceService.getDeviceByID(
            deviceId,
            undefined,
            undefined,
            undefined,
            getAdditionalHeaders(this)
        );
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

Then('device {string} exists with attributes', async function (deviceId: string, data: DataTable) {
    const device = await deviceService.getDeviceByID(
        deviceId,
        undefined,
        undefined,
        undefined,
        getAdditionalHeaders(this)
    );
    validateExpectedAttributes(device, data);
});

Then(
    'device {string} is {string} {string} {string}',
    async function (deviceId, out, rel, groupPath) {
        try {
            const device = await deviceService.getDeviceByID(
                deviceId,
                undefined,
                undefined,
                undefined,
                getAdditionalHeaders(this)
            );
            expect(device.groups?.[out]?.[rel]).include(groupPath);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
            fail(`Expected rel ${rel} of ${groupPath}`);
        }
    }
);
