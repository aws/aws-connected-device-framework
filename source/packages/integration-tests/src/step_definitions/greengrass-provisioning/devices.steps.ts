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
import { setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import chai_string = require('chai-string');
import { use } from 'chai';
import {Device, DevicesService, DeviceTaskSummary, GREENGRASS_PROVISIONING_CLIENT_TYPES} from '@cdf/greengrass-provisioning-client';
import {container} from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { fail } from 'assert';
import { world } from './greengrass.world';
use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const devicesService: DevicesService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.DevicesService);

When('I add devices to greengrass-provisioning group {string} with attributes:', async function (groupName:string, data:TableDefinition) {
    delete world.lastTaskId;
    delete world.lastGroupName;

    try {
        const devices:Device[] = buildModel(data)['devices'];
        const res = await devicesService.associateDevicesWithGroup(groupName, devices, getAdditionalHeaders(world.authToken));
        world.lastTaskId = res.taskId;
        world.lastGroupName = groupName;
    } catch (err) {
        world.errStatus=err.status;
        // fail(`associateDevicesWithGroup failed, err: ${JSON.stringify(err}`);
        fail(`associateDevicesWithGroup failed, err: ${err.message}`);
    }
});

Then('last greengrass-provisioning devices task exists with attributes:', async function (data:TableDefinition) {
    let task:DeviceTaskSummary;
    try {
        task = await devicesService.getDeviceAssociationTask(world.lastGroupName, world.lastTaskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`getDeviceAssociationTask failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(task, data);
});
