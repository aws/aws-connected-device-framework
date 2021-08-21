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
import { Given, setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import { fail } from 'assert';

import {GREENGRASS_DEPLOYMENT_CLIENT_TYPES, DeploymentTemplate, TemplatesService} from '@cdf/greengrass-deployment-client';

import {container} from '../../di/inversify.config';
import { replaceTokens } from '../common/common.steps';
import {world} from './greengrass.world';
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

const templatesService: TemplatesService = container.get(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.TemplatesService);

Given('greengrass-deployment template {string} does not exist', async function (name:string) {
    try {
        await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        world.errStatus=err.status;
        expect(err.status).to.eq(404);
    }
});

When('I create greengrass-deployment template {string} with attributes:', async function (templateName:string, data:TableDefinition) {
    try {
        const template:DeploymentTemplate = buildTemplateModel(data);
        template.name = templateName;
        await templatesService.saveTemplate(template, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`saveTemplate failed, err: ${JSON.stringify(err)}`);
    }
});

When('I update greengrass-deployment template {string} with attributes:', async function (name:string, data:TableDefinition) {
    try {
        const existing = await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
        const updated:DeploymentTemplate = buildTemplateModel(data);
        const merged = Object.assign({}, existing, updated);
        await templatesService.saveTemplate(merged, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`saveTemplate failed, err: ${JSON.stringify(err)}`);
    }
});

Then('greengrass-deployment template {string} exists ', async function (name:string) {
    try {
        await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }
});

Then('greengrass-deployment template {string} exists', async function (name:string) {
    try {
        world['deploymentTemplate'] = await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        expect.fail('Should have been found');
    }
});

function buildTemplateModel<T>(data:TableDefinition) : T {
    const d = data.rowsHash();

    const resource = { } as T;

    Object.keys(d).forEach( key => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            resource[key] = JSON.parse(value);
        } else if (value==='___null___') {
            resource[key] = null;
        } else if (value==='___undefined___') {
            delete resource[key];
        } else {
            resource[key] = value;
        }
    });

    return resource;
}
