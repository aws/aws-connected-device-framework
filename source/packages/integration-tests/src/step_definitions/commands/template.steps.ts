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
import { expect } from 'chai';
import { Given, setDefaultTimeout, Then, DataTable, When } from '@cucumber/cucumber';
import {
    TemplatesService,
    TemplateModel,
    COMMANDS_CLIENT_TYPES,
} from '@aws-solutions/cdf-commands-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS } from '../common/common.steps';
import { container } from '../../di/inversify.config';
import { Dictionary } from '../../../../libraries/core/lambda-invoke/src';
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const templatesService: TemplatesService = container.get(COMMANDS_CLIENT_TYPES.TemplatesService);
function getAdditionalHeaders(world: unknown): Dictionary {
    return {
        Authorization: world[AUTHORIZATION_TOKEN],
    };
}

Given('command template {string} does not exist', async function (templateId: string) {
    try {
        await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('command template {string} exists', async function (templateId: string) {
    const template = await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
    expect(template.templateId).eq(templateId);
});

async function createTemplate(world: unknown, templateId: string, data: DataTable) {
    const d = data.rowsHash();

    const template = {
        templateId,
    } as TemplateModel;

    Object.keys(d).forEach((key) => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            template[key] = JSON.parse(d[key]);
        } else if (value === '___null___') {
            template[key] = null;
        } else if (value === '___undefined___') {
            delete template[key];
        } else {
            template[key] = d[key];
        }
    });

    await templatesService.createTemplate(template, getAdditionalHeaders(world));
}

When(
    'I create the command template {string} with attributes',
    async function (templateId: string, data: DataTable) {
        try {
            await createTemplate(this, templateId, data);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I update command template {string} with attributes',
    async function (templateId: string, data: DataTable) {
        const d = data.rowsHash();

        const template = {
            templateId,
        } as TemplateModel;

        Object.keys(d).forEach((key) => {
            const value = d[key];
            if (value.startsWith('{') || value.startsWith('[')) {
                template[key] = JSON.parse(d[key]);
            } else if (value === '___null___') {
                template[key] = null;
            } else if (value === '___undefined___') {
                delete template[key];
            } else {
                template[key] = d[key];
            }
        });

        try {
            await templatesService.updateTemplate(template, getAdditionalHeaders(this));
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When('I get command template {string}', async function (templateId: string) {
    try {
        await templatesService.getTemplate(templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

When('I delete command template {string}', async function (templateId: string) {
    try {
        await templatesService.deleteTemplate(templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
    }
});

Then(
    'command template {string} exists with attributes',
    async function (templateId: string, data: DataTable) {
        const d = data.rowsHash();
        const r = await templatesService.getTemplate(templateId, getAdditionalHeaders(this));

        Object.keys(d).forEach((key) => {
            const val = d[key];
            if (val.startsWith('{') || val.startsWith('[')) {
                expect(stringify(r[key])).eq(stringify(JSON.parse(val)));
            } else if (val === '___null___') {
                expect(r[key]).eq(null);
            } else if (val === '___undefined___') {
                expect(r[key]).eq(undefined);
            } else {
                expect(r[key]).eq(val);
            }
        });
    }
);
