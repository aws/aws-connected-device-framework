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
import {
    ASSETLIBRARY_CLIENT_TYPES,
    CategoryEnum,
    StatusEnum,
    TemplatesService,
    TypeResource,
} from '@aws-solutions/cdf-assetlibrary-client';
import { Dictionary } from '@aws-solutions/cdf-lambda-invoke';
import { DataTable, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import { fail } from 'assert';
import { expect } from 'chai';
import { container } from '../../di/inversify.config';
import { AUTHORIZATION_TOKEN, RESPONSE_STATUS, replaceTokens } from '../common/common.steps';
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const templatesService: TemplatesService = container.get(
    ASSETLIBRARY_CLIENT_TYPES.TemplatesService
);
function getAdditionalHeaders(world: unknown): Dictionary {
    return {
        authz: world[AUTHORIZATION_TOKEN],
        Accept: 'application/vnd.aws-cdf-v2.0+json',
        'Content-Type': 'application/vnd.aws-cdf-v2.0+json',
    };
}

Given(
    '{word} assetlibrary {word} template {string} does not exist',
    async function (status: StatusEnum, category: CategoryEnum, templateId: string) {
        try {
            await templatesService.getTemplate(
                category,
                templateId,
                status,
                getAdditionalHeaders(this)
            );
            fail('A 404 should be thrown');
        } catch (err) {
            expect(err.status).eq(404);
        }
    }
);

Given(
    'assetlibrary {word} template {string} does not exist',
    async function (category: CategoryEnum, templateId: string) {
        try {
            await templatesService.getTemplate(
                category,
                templateId,
                undefined,
                getAdditionalHeaders(this)
            );
            fail('A 404 should be thrown');
        } catch (err) {
            expect(err.status).eq(404);
        }
    }
);

Given(
    '{word} assetlibrary {word} template {string} exists',
    async function (status: StatusEnum, category: CategoryEnum, templateId: string) {
        try {
            const r = await templatesService.getTemplate(
                category,
                templateId,
                status,
                getAdditionalHeaders(this)
            );
            expect(r.templateId).equalIgnoreCase(templateId);
            expect(r.category).eq(category);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

Given(
    'assetlibrary {word} template {string} exists',
    async function (category: CategoryEnum, templateId: string) {
        try {
            const r = await templatesService.getTemplate(
                category,
                templateId,
                undefined,
                getAdditionalHeaders(this)
            );
            expect(r.templateId).equalIgnoreCase(templateId);
            expect(r.category).eq(category);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I create the assetlibrary {word} template {string} with attributes',
    async function (category: CategoryEnum, templateId: string, data: DataTable) {
        const d = data.rowsHash();

        const resource = new TypeResource();
        resource.templateId = templateId;
        resource.category = category;

        Object.keys(d).forEach((key) => {
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
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

// When including 'relations' key in attributes, include "out": {"parent": [{"name":"root", "includeInAuth": true}],
// The relations key will overwrite those necessary attributes in this function as-written.
When(
    'I create and publish the root authorized assetlibrary group template {string} with attributes',
    async function (templateId: string, data: DataTable) {
        const d = data.rowsHash();

        const resource: TypeResource = {
            templateId: templateId,
            category: 'group',
            relations: {
                out: {
                    parent: [
                        {
                            name: 'root',
                            includeInAuth: true,
                        },
                    ],
                },
            },
        };

        Object.keys(d).forEach((key) => {
            const value = d[key];
            if (value.startsWith('{') || value.startsWith('[')) {
                resource[key] = JSON.parse(d[key]);
            } else {
                resource[key] = d[key];
            }
        });

        try {
            const additionalHeaders = getAdditionalHeaders(this);
            await templatesService.createTemplate(resource, getAdditionalHeaders(this));

            // as this is a self reference, the relation needs to be added post creation
            resource.relations.out.parent.push({
                name: templateId,
                includeInAuth: true,
            });
            await templatesService.updateTemplate(resource, additionalHeaders);

            await templatesService.publishTemplate(
                CategoryEnum.group,
                templateId,
                additionalHeaders
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'publish assetlibrary {word} template {string}',
    async function (category: CategoryEnum, templateId: string) {
        try {
            await templatesService.publishTemplate(
                category,
                templateId,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

When(
    'I delete assetlibrary {word} template {string}',
    async function (category: CategoryEnum, templateId: string) {
        try {
            await templatesService.deleteTemplate(
                category,
                templateId,
                getAdditionalHeaders(this)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

Then(
    '{word} assetlibrary {word} template {string} exists with attributes',
    async function (
        status: StatusEnum,
        category: CategoryEnum,
        templateId: string,
        data: DataTable
    ) {
        const rowHash = data.rowsHash();

        try {
            const r = await templatesService.getTemplate(
                category,
                templateId,
                status,
                getAdditionalHeaders(this)
            );
            expect(r.templateId).equalIgnoreCase(templateId);
            expect(r.category).eq(category);
            const properties = replaceTokens(rowHash['properties']);
            expect(JSON.stringify(r.properties)).eq(properties);
            expect(JSON.stringify(r.required)).eq(rowHash['required']);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);

Then(
    'assetlibrary {word} template {string} exists with attributes',
    async function (category: CategoryEnum, templateId: string, data: DataTable) {
        const rowHash = data.rowsHash();

        try {
            const r = await templatesService.getTemplate(
                category,
                templateId,
                undefined,
                getAdditionalHeaders(this)
            );
            expect(r.templateId).equalIgnoreCase(templateId);
            expect(r.category).eq(category);
            const properties = replaceTokens(rowHash['properties']);
            expect(JSON.stringify(r.properties)).eq(properties);
            expect(JSON.stringify(r.required)).eq(rowHash['required']);
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
        }
    }
);
