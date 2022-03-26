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

import { fail } from 'assert';
import { expect, use } from 'chai';
import { Given, setDefaultTimeout, DataTable, Then, When } from '@cucumber/cucumber';
import {
    Device, DevicesService, DeviceTask, GREENGRASS2_PROVISIONING_CLIENT_TYPES, NewDeviceTask
} from '@cdf/greengrass2-provisioning-client';

import { container } from '../../di/inversify.config';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './greengrass2.world';

import chai_string = require('chai-string');
import { GreengrassV2Client, ListClientDevicesAssociatedWithCoreDeviceCommand } from '@aws-sdk/client-greengrassv2';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const devicesService: DevicesService = container.get(GREENGRASS2_PROVISIONING_CLIENT_TYPES.DevicesService);

const greengrass: GreengrassV2Client = new GreengrassV2Client({ region: process.env.AWS_REGION });


Given('greengrass2-provisioning client device {string} does not exist', async function (name: string) {
    try {
        await devicesService.getDevice(name, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        expect(err.status).to.eq(404);
    }
});

Given('greengrass2-provisioning client device {string} exists with attributes:', async function (name: string, data: DataTable) {
    let device: Device;
    try {
        device = await devicesService.getDevice(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`getDevice failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(device, data);
});

Then('greengrass2-provisioning client device {string} exists', async function (name: string) {
    try {
        await devicesService.getDevice(name, getAdditionalHeaders(world.authToken))
    } catch (err) {
        world.errStatus = err.status;
        expect.fail('Should have been found');
    }
});

When('I create greengrass2-provisioning client device task with attributes:', async function (data: DataTable) {
    delete world.lastClientDeviceTaskId;
    try {
        const task: NewDeviceTask = buildModel(data);
        world.lastClientDeviceTaskId = await devicesService.createDeviceTask(task, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`createDeviceTask failed, err: ${JSON.stringify(err)}`);
    }
});

When('I delete client device {string}', async function (name: string) {
    delete world.lastClientDeviceTaskId;
    try {
        await devicesService.deleteDevice(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`deleteDevice failed, err: ${JSON.stringify(err)}`);
    }
});

When('I create greengrass2-provisioning client device task with invalid attributes:', async function (data: DataTable) {
    delete world.lastClientDeviceTaskId;
    try {
        const task: NewDeviceTask = buildModel(data);
        world.lastClientDeviceTaskId = await devicesService.createDeviceTask(task, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
    }
});


Then('last greengrass2-provisioning client device task fails with a {int}', function (status: number) {
    expect(world.errStatus, 'response').eq(status);
});


Then('last greengrass2-provisioning client device task exists with attributes:', async function (data: DataTable) {
    let task: DeviceTask;
    try {
        task = await devicesService.getDeviceTask(world.lastClientDeviceTaskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`getDeviceTask failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(task, data);
});

Then('device {string} should be associated with greengrass2 core {string}', async function (deviceName: string, coreName: string) {
    try {
        const listClientResponse = await greengrass.send(new ListClientDevicesAssociatedWithCoreDeviceCommand({
            coreDeviceThingName: coreName
        }))
        const associatedDevices = listClientResponse.associatedClientDevices.map(o => o.thingName);
        expect(associatedDevices).include(deviceName)

    } catch (err) {
        world.errStatus = err.status;
        fail(`client device ${deviceName}} not associated with core ${coreName}, err: ${JSON.stringify(err)}`);
    }
});

Then('device {string} should not be associated with greengrass2 core {string}', async function (deviceName: string, coreName: string) {
    try {
        const listClientResponse = await greengrass.send(new ListClientDevicesAssociatedWithCoreDeviceCommand({
            coreDeviceThingName: coreName
        }))
        const associatedDevices = listClientResponse.associatedClientDevices.map(o => o.thingName);
        expect(associatedDevices).not.include(deviceName)

    } catch (err) {
        world.errStatus = err.status;
        fail(`client device ${deviceName}} not associated with core ${coreName}, err: ${JSON.stringify(err)}`);
    }
});

