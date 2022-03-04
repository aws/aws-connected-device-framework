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
import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import { Device20Resource, DevicesService } from '@cdf/assetlibrary-client';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
import { RESPONSE_STATUS, replaceTokens, AUTHORIZATION_TOKEN} from '../common/common.steps';
import {ASSTLIBRARY_CLIENT_TYPES} from '@cdf/assetlibrary-client/dist';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';
import {container} from '../../di/inversify.config';
use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this

setDefaultTimeout(10 * 1000);

const deviceService:DevicesService = container.get(ASSTLIBRARY_CLIENT_TYPES.DevicesService);

function getAdditionalHeaders(world:unknown) : Dictionary {
    const authCode= world[AUTHORIZATION_TOKEN];
    const headers = {
        Authorization: authCode,
        Accept: 'application/vnd.aws-cdf-v2.0+json',
        'Content-Type': 'application/vnd.aws-cdf-v2.0+json',
    };
    return headers;
}

Given('device {string} does not exist', async function (deviceId:string) {
    try {
        await deviceService.getDeviceByID(deviceId, undefined, undefined, undefined, getAdditionalHeaders(this));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('device {string} exists', async function (deviceId:string) {
    const device = await deviceService.getDeviceByID(deviceId, undefined, undefined, undefined, getAdditionalHeaders(this));
    expect(device.deviceId).equalIgnoreCase(deviceId);
});

async function registerDevice (world:unknown, deviceId:string, data:TableDefinition, profileId?:string) {

    const d = data.rowsHash();

    const device: Device20Resource = {
        deviceId,
        templateId: undefined,
    };

    Object.keys(d).forEach( key => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            device[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            device[key] = null;
        } else if (value==='___undefined___') {
            delete device[key];
        } else {
            device[key] = d[key];
        }
    });

    const headers=getAdditionalHeaders(world);
    await deviceService.createDevice(device, profileId, headers);
}

When('I create device {string} with attributes', async function (deviceId:string, data:TableDefinition) {
    try {
        await registerDevice(this, deviceId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create device {string} applying profile {string} with attributes', async function (deviceId:string, profileId:string, data:TableDefinition) {

    try {
        await registerDevice(this, deviceId, data, profileId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create device {string} with invalid attributes', async function (deviceId:string, data:TableDefinition) {
    try {
        await registerDevice(this, deviceId, data);
        fail('Expected 400');
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        expect(err.status).eq(400);
    }
});

When('I update device {string} with attributes', async function (deviceId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const device: Device20Resource = {
        templateId: undefined
    };

    Object.keys(d).forEach( key => {
        const value = replaceTokens( d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            device[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            device[key] = null;
        } else if (value==='___undefined___') {
            delete device[key];
        } else {
            device[key] = d[key];
        }
    });

    try {
        await deviceService.updateDevice(deviceId, device, undefined, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update device {string} applying profile {string}', async function (deviceId:string, profileId:string) {
    const device: Device20Resource = {
        deviceId,
        templateId: undefined
    };

    try {
        await deviceService.updateDevice(deviceId, device, profileId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I add device {string} to group {string} related via {string}', async function (deviceId:string, groupPath:string, relationship:string) {
    try {
        await deviceService.attachToGroup(deviceId, relationship, groupPath, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I remove device {string} from group {string} related via {string}', async function (deviceId:string, groupPath:string, relationship:string) {
    try {
        await deviceService.detachFromGroup(deviceId, relationship, groupPath, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete device {string}', async function (deviceId:string) {
    try {
        await deviceService.deleteDevice(deviceId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I get device {string}', async function (deviceId:string) {
    try {
        await deviceService.getDeviceByID(deviceId, undefined, undefined, undefined, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('device {string} exists with attributes', async function (deviceId:string, data:TableDefinition) {
    const d = data.rowsHash();
    const r = await deviceService.getDeviceByID(deviceId, undefined, undefined, undefined, getAdditionalHeaders(this));

    Object.keys(d).forEach( key => {
        const val = replaceTokens(d[key]);
        if (val.startsWith('{') || val.startsWith('[')) {
            expect(stringify(r[key])).eq( stringify(JSON.parse(val)));
        } else if (val==='___null___') {
            expect(r[key]).eq(null);
        } else if (val==='___undefined___') {
            expect(r[key]).eq(undefined);
        } else {
            expect(r[key]).eq( val);
        }
    });
});

Then('device {string} is {string} {string} {string}', async function (deviceId, out, rel, groupPath) {
    try {
        const device = await deviceService.getDeviceByID(deviceId, undefined, undefined, undefined, getAdditionalHeaders(this));
        expect(device.groups?.[out]?.[rel]).include(groupPath);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        fail(`Expected rel ${rel} of ${groupPath}`);
    }
});
