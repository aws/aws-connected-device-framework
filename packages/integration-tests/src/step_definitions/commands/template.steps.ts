/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { Before, Given, setDefaultTimeout, Then, TableDefinition, When} from 'cucumber';
import { TemplatesService, TemplateModel } from '@cdf/commands-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';
import { RESPONSE_STATUS } from '../common/common.steps';

setDefaultTimeout(10 * 1000);

let templates: TemplatesService;

Before(function () {
    templates = new TemplatesService();
});

Given('command template {string} does not exist', async function (templateId:string) {
    try {
        await templates.getTemplate(templateId);
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('command template {string} exists', async function (templateId:string) {
    const template = await templates.getTemplate(templateId);
    expect(template.templateId).eq(templateId);
});

async function createTemplate (templateId:string, data:TableDefinition) {

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

    await templates.createTemplate(template);
}

When('I create the command template {string} with attributes', async function (templateId:string, data:TableDefinition) {
    try {
        await createTemplate(templateId, data);
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
        await templates.updateTemplate(template);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I get command template {string}', async function (templateId:string) {
    try {
        await templates.getTemplate(templateId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete command template {string}', async function (templateId:string) {
    try {
        await templates.deleteTemplate(templateId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('command template {string} exists with attributes', async function (templateId:string, data:TableDefinition) {
    const d = data.rowsHash();
    const r = await templates.getTemplate(templateId);

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
