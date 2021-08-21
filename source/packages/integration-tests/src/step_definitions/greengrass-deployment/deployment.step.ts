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
import {use} from 'chai';
import { Then, When, setDefaultTimeout, TableDefinition } from 'cucumber';

import { DeploymentService } from '@cdf/greengrass-deployment-client';
import { GREENGRASS_DEPLOYMENT_CLIENT_TYPES } from '@cdf/greengrass-deployment-client';

import { container } from '../../di/inversify.config';
import {RESPONSE_STATUS, validateExpectedAttributes} from '../common/common.steps';
import { world } from './greengrass.world';
import { getAdditionalHeaders } from '../common/common.steps';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const deploymentService: DeploymentService = container.get(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.DeploymentService);

When('I create a deployment for {string} greengrass core', async function(deviceId:string) {
    const deployment = {
        deviceId,
        deploymentTemplateName: "test_template"
    }
    try {
        this['deployment'] = await deploymentService.createDeployment(deployment, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

When('I list deployments for {string} greengrass core', async function(deviceId: string) {
    try {
        this['deployment'] = await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

When('I delete {string} for a device {string}', async function (deploymentId:string, deviceId: string) {
    try {
        await deploymentService.deleteDeployment(deploymentId, deviceId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

Then('deployments exists for {string}', async function(deviceId: string) {
    try {
        await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

Then('a list of deployments for {string} exists with attributes', async function(deviceId: string, data:TableDefinition) {
    let deployment
    try {
        deployment = await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }

    validateExpectedAttributes(deployment, data);
});

