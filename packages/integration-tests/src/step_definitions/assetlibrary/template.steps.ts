/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import {
    TemplatesService,
    CategoryEnum,
    StatusEnum,
    TypeResource,
    ASSTLIBRARY_CLIENT_TYPES,
} from '@cdf/assetlibrary-client/dist';
import { fail } from 'assert';
import {RESPONSE_STATUS, replaceTokens, AUTHORIZATION_TOKEN} from '../common/common.steps';
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

const templatesService:TemplatesService = container.get(ASSTLIBRARY_CLIENT_TYPES.TemplatesService);
function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

Given('{word} assetlibrary {word} template {string} does not exist', async function (
    status:StatusEnum, category:CategoryEnum, templateId:string) {

    try {
        await templatesService.getTemplate(category, templateId, status, getAdditionalHeaders(this));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('assetlibrary {word} template {string} does not exist', async function (
    category:CategoryEnum, templateId:string) {

    try {
        await templatesService.getTemplate(category, templateId, undefined, getAdditionalHeaders(this));
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('{word} assetlibrary {word} template {string} exists', async function (status:StatusEnum,
    category:CategoryEnum, templateId:string) {
    try {
        const r = await templatesService.getTemplate(category, templateId, status , getAdditionalHeaders(this));
        expect(r.templateId).equalIgnoreCase(templateId);
        expect(r.category).eq(category);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Given('assetlibrary {word} template {string} exists', async function (
    category:CategoryEnum, templateId:string) {
    try {
        const r = await templatesService.getTemplate(category, templateId, undefined, getAdditionalHeaders(this) );
        expect(r.templateId).equalIgnoreCase(templateId);
        expect(r.category).eq(category);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create the assetlibrary {word} template {string} with attributes', async function (category:CategoryEnum, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const resource = new TypeResource();
    resource.templateId = templateId;
    resource.category = category;

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            resource[key] = JSON.parse(d[key]);
        } else {
            resource[key] = d[key];
        }
    });

    try {
        await templatesService.createTemplate(resource, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('publish assetlibrary {word} template {string}', async function (category:CategoryEnum, templateId:string) {
    try {
        await templatesService.publishTemplate(category, templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete assetlibrary {word} template {string}', async function (category:CategoryEnum, templateId:string) {
    try {
        await templatesService.deleteTemplate(category, templateId, getAdditionalHeaders(this));
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('{word} assetlibrary {word} template {string} exists with attributes', async function (status:StatusEnum,
    category:CategoryEnum, templateId:string, data:TableDefinition) {
    const rowHash = data.rowsHash();

    try {
        const r = await templatesService.getTemplate(category, templateId, status, getAdditionalHeaders(this) );
        expect(r.templateId).equalIgnoreCase(templateId);
        expect(r.category).eq(category);
        const properties = replaceTokens(rowHash['properties']);
        expect(JSON.stringify(r.properties)).eq(properties);
        expect(JSON.stringify(r.required)).eq(rowHash['required']);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('assetlibrary {word} template {string} exists with attributes', async function (
    category:CategoryEnum, templateId:string, data:TableDefinition) {
    const rowHash = data.rowsHash();

    try {
        const r = await templatesService.getTemplate(category, templateId, undefined, getAdditionalHeaders(this) );
        expect(r.templateId).equalIgnoreCase(templateId);
        expect(r.category).eq(category);
        const properties = replaceTokens(rowHash['properties']);
        expect(JSON.stringify(r.properties)).eq(properties);
        expect(JSON.stringify(r.required)).eq(rowHash['required']);

    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});
