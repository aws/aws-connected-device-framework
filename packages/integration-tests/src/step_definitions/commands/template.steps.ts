/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { Given, setDefaultTimeout, Then, TableDefinition, When} from 'cucumber';
import {TemplatesService, TemplateModel, COMMANDS_CLIENT_TYPES} from '@cdf/commands-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';
import {AUTHORIZATION_TOKEN, RESPONSE_STATUS} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const templatesService:TemplatesService = container.get(COMMANDS_CLIENT_TYPES.TemplatesService);
function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

Given('command template {string} does not exist', async function (templateId:string) {
    try {
        await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('command template {string} exists', async function (templateId:string) {
    const template = await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
    expect(template.templateId).eq(templateId);
});

async function createTemplate (world:any, templateId:string, data:TableDefinition) {

    const d = data.rowsHash();

    const template = {
        templateId
    } as TemplateModel;

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            template[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            template[key] = null;
        } else if (value==='___undefined___') {
            delete template[key];
        } else {
            template[key] = d[key];
        }
    });

    await templatesService.createTemplate(template, getAdditionalHeaders(world));
}

When('I create the command template {string} with attributes', async function (templateId:string, data:TableDefinition) {
    try {
        await createTemplate(this, templateId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update command template {string} with attributes', async function (templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const template = {
        templateId
    } as TemplateModel;

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            template[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            template[key] = null;
        } else if (value==='___undefined___') {
            delete template[key];
        } else {
            template[key] = d[key];
        }
    });

    try {
        await templatesService.updateTemplate(template, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I get command template {string}', async function (templateId:string) {
    try {
        await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete command template {string}', async function (templateId:string) {
    try {
        await templatesService.deleteTemplate(templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('command template {string} exists with attributes', async function (templateId:string, data:TableDefinition) {
    const d = data.rowsHash();
    const r = await templatesService.getTemplate(templateId, getAdditionalHeaders(this));

    Object.keys(d).forEach( key => {
        const val = d[key];
        if (val.startsWith('{') || val.startsWith('[')) {
            expect(stringify(r[key])).eq( stringify(JSON.parse(val)));
        } else if (val==='___null___') {
            expect(r[key]).eq(null);
        } else if (val==='___undefined___') {
            expect(r[key]).eq(undefined);
        } else {
            expect(r[key]).eq( val);
        }
    });
});
