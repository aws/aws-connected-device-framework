/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import 'reflect-metadata';
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import {When, Then, setDefaultTimeout, TableDefinition} from 'cucumber';

import { ActivationService } from '@cdf/greengrass-deployment-client';
import { GREENGRASS_DEPLOYMENT_CLIENT_TYPES } from '@cdf/greengrass-deployment-client';

import { container } from '../../di/inversify.config';
import { world } from './greengrass.world';

import {getAdditionalHeaders, RESPONSE_STATUS, validateExpectedAttributes} from '../common/common.steps';


use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const activationService: ActivationService = container.get(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.ActivationService);


When('I create an activation for {string} greengrass core', async function(deviceId:string) {
    try {
        this['activation'] = await activationService.createActivation(deviceId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

When('I delete the last activation for {string} greengrass core', async function(deviceId:string) {
    const activationId = this['activation'].activationId;
    try {
        await activationService.deleteActivation(activationId, deviceId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }
});

Then('an activation exists for {string} with attributes', async function(deviceId:string, data:TableDefinition) {
    const activationId = this['activation'].activationId;
    let activation;
    try {
        activation = await activationService.getActivation(activationId, deviceId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS]=e.status;
    }

    validateExpectedAttributes(activation, data);
});

Then('an activation is created with attributes', async function(data:TableDefinition) {
    const activation = this['activation'];
    validateExpectedAttributes(activation, data);
});

Then('the last activation does not exists for {string}', async function(deviceId:string) {
    const activationId = this['activation'].activationId;
    try {
        this['activation'] = await activationService.getActivation(activationId, deviceId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        expect(e.status).eq(404);
    }
});




