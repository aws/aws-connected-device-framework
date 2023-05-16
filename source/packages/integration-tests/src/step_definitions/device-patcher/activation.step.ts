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
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import { Given, When, Then, setDefaultTimeout, DataTable } from '@cucumber/cucumber';

import { ActivationService } from '@aws-solutions/cdf-device-patcher-client';
import { DEVICE_PATCHER_CLIENT_TYPES } from '@aws-solutions/cdf-device-patcher-client';

import { container } from '../../di/inversify.config';
import { world } from './device.world';

import {
    getAdditionalHeaders,
    RESPONSE_STATUS,
    validateExpectedAttributes,
} from '../common/common.steps';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const activationService: ActivationService = container.get(
    DEVICE_PATCHER_CLIENT_TYPES.ActivationService
);

When('I create an activation for {string} edge device', async function (deviceId: string) {
    try {
        this['activation'] = await activationService.createActivation(
            deviceId,
            getAdditionalHeaders(world.authToken)
        );
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

When('I delete the activation for {string} edge device', async function (_deviceId: string) {
    const activationId = this['activation'].activationId;
    try {
        await activationService.deleteActivation(
            activationId,
            getAdditionalHeaders(world.authToken)
        );
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

Then(
    'an activation exists for {string} with attributes',
    async function (_deviceId: string, data: DataTable) {
        const activationId = this['activation'].activationId;
        let activation;
        try {
            activation = await activationService.getActivation(
                activationId,
                getAdditionalHeaders(world.authToken)
            );
        } catch (e) {
            this[RESPONSE_STATUS] = e.status;
        }

        validateExpectedAttributes(activation, data);
    }
);

Then('an activation is created with attributes', async function (data: DataTable) {
    const activation = this['activation'];
    validateExpectedAttributes(activation, data);
});

Given('an activation {string} does not exist', async function (activationId: string) {
    try {
        await activationService.getActivation(activationId, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have been thrown');
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        expect(err.status).to.eq(404);
    }
});

Then('the activation does not exists for {string}', async function (_deviceId: string) {
    const activationId = this['activation'].activationId;
    try {
        this['activation'] = await activationService.getActivation(
            activationId,
            getAdditionalHeaders(world.authToken)
        );
    } catch (e) {
        expect(e.status).eq(404);
    }
});
