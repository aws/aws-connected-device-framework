/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Before, Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import { Device, DevicesService } from '@cdf/assetlibrary-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
import { RESPONSE_STATUS, replaceTokens } from '../common/common.steps';
use(chai_string);

setDefaultTimeout(10 * 1000);

let devices: DevicesService;

Before(function () {
    devices = new DevicesService();
});

Given('device {string} does not exist', async function (deviceId:string) {
    try {
        await devices.getDeviceByID(deviceId);
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('device {string} exists', async function (deviceId:string) {
    const device = await devices.getDeviceByID(deviceId);
    expect(device.deviceId).equalIgnoreCase(deviceId);
});

async function registerDevice (deviceId:string, data:TableDefinition, profileId?:string) {

    const d = data.rowsHash();
    
    const device: Device = {
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

    await devices.createDevice(device, profileId);
}

When('I create device {string} with attributes', async function (deviceId:string, data:TableDefinition) {
    try {
        await registerDevice(deviceId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create device {string} applying profile {string} with attributes', async function (deviceId:string, profileId:string, data:TableDefinition) {

    try {
        await registerDevice(deviceId, data, profileId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create device {string} with invalid attributes', async function (deviceId:string, data:TableDefinition) {
    try {
        await registerDevice(deviceId, data);
        fail('Expected 400');
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        expect(err.status).eq(400);
    }
});

When('I update device {string} with attributes', async function (deviceId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const device: Device = {
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
        await devices.updateDevice(deviceId, device);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update device {string} applying profile {string}', async function (deviceId:string, profileId:string) {
    const device: Device = {
        deviceId,
        templateId: undefined
    };

    try {
        await devices.updateDevice(deviceId, device, profileId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I remove device {string} from group {string} related via {string}', async function (deviceId:string, groupPath:string, relationship:string) {
    try {
        await devices.detachFromGroup(deviceId, relationship, groupPath);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete device {string}', async function (deviceId:string) {
    try {
        await devices.deleteDevice(deviceId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I get device {string}', async function (deviceId:string) {
    try {
        await devices.getDeviceByID(deviceId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('device {string} exists with attributes', async function (deviceId:string, data:TableDefinition) {
    const d = data.rowsHash();
    const r = await devices.getDeviceByID(deviceId);

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

Then('device {string} is {string} {string}', async function (deviceId, rel, groupPath) {
    try {
        const device = await devices.getDeviceByID(deviceId);
        expect(device.groups[rel]).include(groupPath);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        fail(`Expected rel ${rel} of ${groupPath}`);
    }
});
