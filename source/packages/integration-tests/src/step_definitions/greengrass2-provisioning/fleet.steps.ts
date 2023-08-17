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
import { use } from 'chai';
import { setDefaultTimeout, DataTable, Then } from '@cucumber/cucumber';
import { GREENGRASS2_PROVISIONING_CLIENT_TYPES } from '@awssolutions/cdf-greengrass2-provisioning-client';

import { container } from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './greengrass2.world';

import chai_string = require('chai-string');
import { FleetService } from '@awssolutions/cdf-greengrass2-provisioning-client';
import { validateExpectedAttributes } from '../common/common.steps';
use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const fleetService: FleetService = container.get(
    GREENGRASS2_PROVISIONING_CLIENT_TYPES.FleetService
);

Then('fleet summary should be updated with this attributes:', async function (data: DataTable) {
    let summary;
    try {
        summary = await fleetService.getFleetSummary(getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`getFleetSummary failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(summary, data);
});
