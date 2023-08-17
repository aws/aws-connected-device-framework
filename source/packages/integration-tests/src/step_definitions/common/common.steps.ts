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

import { DataTable, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';
import { JSONPath } from 'jsonpath-plus';
import { sign } from 'jsonwebtoken';

import {
    CloudFormationClient,
    ListStackResourcesCommand,
    StackResourceSummary,
} from '@aws-sdk/client-cloudformation';

import { Readable } from 'stream';

chai.use(deepEqualInAnyOrder);

setDefaultTimeout(10 * 1000);

export const RESPONSE_STATUS = 'responseStatus';
export const TIME_SCENARIO_STARTED = 'scenarioTestStartedAt';
export const AUTHORIZATION_TOKEN = 'jwt';
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

export function getAdditionalHeaders(authToken?: string): Dictionary {
    return {
        Authorization: authToken,
    };
}

export function replaceTokens(text: string): string {
    return text.replace(/%property:(.*?)%/g, (_a, property) => {
        return process.env[property];
    });
}

Given('I store the time the test started', function () {
    // just in case theres a slight difference between clocks, minus a few seconds
    this[TIME_SCENARIO_STARTED] = new Date(Date.now() - 200).toISOString();
});

Given('pause for {int}ms', async function (ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
});

Given('my authorization is', async function (data: DataTable) {
    const d = data.rowsHash();

    const token = {
        cdf_al: [] as string[],
    };

    Object.keys(d).forEach((key) => {
        token.cdf_al.push(`${key}:${d[key]}`);
    });

    const signedToken = sign(token, 'shared-secret');
    this[AUTHORIZATION_TOKEN] = signedToken;
});

Given(
    'I restored DynamoDB data table {string} in stack {string}',
    async (restoredTableName: string, stackName: string) => {
        const cfnClient = new CloudFormationClient({ region: process.env.AWS_REGION });
        const listStackResourcesCommand = new ListStackResourcesCommand({ StackName: stackName });
        const listStackResourcesResponse = await cfnClient.send(listStackResourcesCommand);
        expect(
            listStackResourcesResponse.StackResourceSummaries?.filter(
                (resource: StackResourceSummary) =>
                    resource.PhysicalResourceId === restoredTableName
            )
        ).to.have.length(1);
    }
);

When('I pause for {int}ms', { timeout: -1 }, async function (ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
});

Then('it fails with a {int}', function (status: number) {
    expect(this[RESPONSE_STATUS], 'response').eq(status);
});

Then('no operation is needed', () => undefined);

export function validateExpectedAttributes<T>(model: T, data: DataTable, world?: unknown): void {
    const d = data.rowsHash();
    const json = model as unknown as Record<string, unknown>;
    Object.keys(d).forEach((key) => {
        const expected = replaceTokens(d[key]);
        const expandedKey = replaceTokens(key);
        const actual = JSONPath({ path: expandedKey, json });
        if (expected === '___null___') {
            expect(actual?.[0], expandedKey).eq(null);
        } else if (expected === '___undefined___') {
            expect(actual?.[0], expandedKey).eq(undefined);
        } else if (expected === '___any___') {
            expect(actual?.[0] !== undefined, expandedKey).eq(true);
        } else if (expected === '___uuid___') {
            expect(actual?.[0], expandedKey).to.be.uuid('v1');
        } else if (expected === '___arn___') {
            expect(actual?.[0], expandedKey).to.startWith('arn:aws:');
        } else if (expected === 'true' || expected === 'false') {
            expect(actual?.[0], expandedKey).eq(Boolean(expected));
        } else if (expected.startsWith('___regex___:')) {
            const regex = RegExp(expected.replace('___regex___:', ''));
            expect(actual?.[0], expandedKey).match(regex);
        } else if (expected.startsWith('___world___:')) {
            const keys = expected.replace('___world___:', '').split('.');
            let v = world;
            keys.forEach((k) => (v = v[k]));
            expect(actual?.[0], expandedKey).to.eq(v);
        } else if (expected.startsWith('{') && expected.endsWith('}')) {
            const json = JSON.parse(expected);
            expect(actual?.[0], expandedKey).to.deep.eq(json);
        } else if (expected.startsWith('___deepEqualInAnyOrder___ ')) {
            const json = JSON.parse(expected.replace('___deepEqualInAnyOrder___ ', ''));
            expect(actual?.[0], expandedKey).to.deep.equalInAnyOrder(json);
        } else {
            expect(String(actual?.[0]), expandedKey).to.eq(expected);
        }
    });
}

export async function streamToString(stream: Readable): Promise<string> {
    return await new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
}

export function buildModel<T>(data: DataTable, initial: Record<string, string> = {}): T {
    if (data === undefined) {
        return undefined;
    }

    const d = data.rowsHash();
    const resource = { ...initial } as unknown as T;

    Object.keys(d).forEach((key) => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            resource[key] = JSON.parse(value);
        } else if (value === '___null___') {
            resource[key] = null;
        } else if (value === '___undefined___') {
            delete resource[key];
        } else {
            resource[key] = value;
        }
    });

    return resource;
}

export class Dictionary {
    [key: string]: string;
}
