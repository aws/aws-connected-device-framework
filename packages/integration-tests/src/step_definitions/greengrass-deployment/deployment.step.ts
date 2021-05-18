/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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

