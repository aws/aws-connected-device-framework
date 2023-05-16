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
    BulkDevicesResource,
    Device20Resource,
    DevicesService,
} from '@aws-solutions/cdf-assetlibrary-client';
import { ASSETLIBRARY_CLIENT_TYPES } from '@aws-solutions/cdf-assetlibrary-client/dist';
import { Dictionary } from '@aws-solutions/cdf-lambda-invoke';
import { DataTable, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import { fail } from 'assert';
import { expect, use } from 'chai';
import 'reflect-metadata';
import { container } from '../../di/inversify.config';
import { AUTHORIZATION_TOKEN } from '../common/common.steps';

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

async function bulkRegisterDevice(world: unknown, devicesToCreate: Device20Resource[]) {
    const headers = getAdditionalHeaders(world);
    const bulkDeviceCreateBody: BulkDevicesResource = { devices: devicesToCreate };
    await deviceService.bulkCreateDevice(bulkDeviceCreateBody, undefined, headers);
}

function parseBulkDeviceTable(d: DataTable): Device20Resource[] {
    const devices: Device20Resource[] = [];
    const deviceRows = d.rows();
    deviceRows.forEach((dr) => {
        devices.push({
            deviceId: dr[0],
            templateId: dr[1],
            description: dr[2],
            awsIotThingArn: dr[3],
            attributes: JSON.parse(dr[4]),
            groups: JSON.parse(dr[5]),
        });
    });
    return devices;
}

When('I bulk create the following devices', async function (data: DataTable) {
    const devices = parseBulkDeviceTable(data);
    await bulkRegisterDevice(this, devices);
});

Then(
    'a bulk get of {string} returns the following devices',
    async function (devicesToGet: string, data: DataTable) {
        const devices = parseBulkDeviceTable(data);
        const devicesReceived = await deviceService.getDevicesByID(
            devicesToGet.split(','),
            undefined,
            undefined,
            undefined,
            getAdditionalHeaders(this)
        );

        if (devices.length === 0) {
            expect(devicesReceived.results).to.be.empty;
        } else {
            expect(devicesReceived.results.length).to.equal(devices.length);
            devices.forEach((d) => {
                const dReceived = devicesReceived.results.filter((dr) => {
                    return dr.deviceId === d.deviceId.toLowerCase();
                });

                if (dReceived.length !== 1) {
                    fail(`${d.deviceId} not found in AssetLibrary`);
                }
                expect(dReceived[0].deviceId).to.equal(d.deviceId.toLowerCase());
                expect(dReceived[0].templateId).to.equal(d.templateId.toLowerCase());
                expect(dReceived[0].description).to.equal(d.description);
                expect(dReceived[0].awsIotThingArn).to.equal(d.awsIotThingArn);
                expect(dReceived[0].state).to.equal('unprovisioned');
                expect(dReceived[0].attributes).to.deep.equal(d.attributes);
            });
        }
    }
);
