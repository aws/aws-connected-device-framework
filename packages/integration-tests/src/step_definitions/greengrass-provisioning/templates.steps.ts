/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Given, setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import {GREENGRASS_PROVISIONING_CLIENT_TYPES, Template, TemplatesService} from '@cdf/greengrass-provisioning-client';
import {container} from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { replaceTokens, validateExpectedAttributes } from '../common/common.steps';
import { fail } from 'assert';
import {world} from './greengrass.world';
use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const templatesService: TemplatesService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.TemplatesService);

Given('greengrass-provisioning template {string} does not exist', async function (name:string) {
    try {
        await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        world.errStatus=err.status;
        expect(err.status).to.eq(404);
    }
});

When('I create greengrass template {string} from group {string} with attributes:', async function (templateName:string, groupName:string, data:TableDefinition) {
    try {
        const template:Template = buildTemplateModel(data);
        template.name = templateName;
        template.groupId = world.groupNameToIds[groupName].groupId;
        await templatesService.saveTemplate(template, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`saveTemplate failed, err: ${JSON.stringify(err)}`);
    }
});

When('I update greengrass-provisioning template {string} with attributes:', async function (name:string, data:TableDefinition) {
    try {
        const existing = await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
        const updated:Template = buildTemplateModel(data);
        const merged = Object.assign({}, existing, updated);
        merged.groupVersionId = updated.groupVersionId;
        await templatesService.saveTemplate(merged, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`saveTemplate failed, err: ${JSON.stringify(err)}`);
    }
});

Then('greengrass-provisioning template {string} exists with attributes:', async function (name:string, data:TableDefinition) {
    
    let template:Template;
    try {
        template = await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(template, data);
});

Then('greengrass-provisioning template {string} exists', async function (name:string) {
    try {
        await templatesService.getTemplate(name, getAdditionalHeaders(world.authToken));
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