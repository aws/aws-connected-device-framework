/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { setDefaultTimeout, Then, Given, TableDefinition, When} from 'cucumber';
import {expect} from 'chai';
import config from 'config';
import { sign } from 'jsonwebtoken';
import {JSONPath} from 'jsonpath-plus';


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

export function getAdditionalHeaders(authToken?:string) : Dictionary {
    return  {
        Authorization: authToken
    };
}

export function replaceTokens(text:string) : string {
    return text.replace(/%property:(.*?)%/g, (_a,property)=> {
        return config.get(property);
    });
}

Given('I store the time the test started', function() {
    // just in case theres a slight difference between clocks, minus a few seconds
    this[TIME_SCENARIO_STARTED] = new Date(Date.now() - 200).toISOString();
});

Given('pause for {int}ms', async function (ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
});

Given('my authorization is', async function (data:TableDefinition) {
    const d = data.rowsHash();

    const token =  {
        cdf_al: [] as string[]
    };

    Object.keys(d).forEach( key => {
        token.cdf_al.push(`${key}:${d[key]}`);
    });

    const signedToken = sign(token, 'shared-secret');
    this[AUTHORIZATION_TOKEN]=signedToken;
});

When('I pause for {int}ms', async function (ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
});

Then('it fails with a {int}', function (status:number) {
    expect(this[RESPONSE_STATUS], 'response').eq(status);
});

export function validateExpectedAttributes<T>(model:T, data:TableDefinition) : void {
    const d = data.rowsHash();
    const json = model as unknown as Record<string, unknown>;
    Object.keys(d).forEach( key => {
        const expected = replaceTokens(d[key]);
        const expandedKey = replaceTokens(key);
        const actual = JSONPath({path:expandedKey, json});
        // logger.debug(`*****> key:${expandedKey}, actual:${JSON.stringify(actual)}`);
        if (expected==='___null___') {
            expect(actual?.[0], expandedKey).eq(null);
        } else if (expected==='___undefined___') {
            expect(actual?.[0], expandedKey).eq(undefined);
        } else if (expected==='___any___') {
            expect(actual?.[0]!==undefined, expandedKey).eq(true);
        } else if (expected==='___uuid___') {
            expect(actual?.[0], expandedKey).to.be.uuid('v1');
        } else if (expected==='___arn___') {
            expect(actual?.[0], expandedKey).to.startWith('arn:aws:');
        } else if (expected==='true' || expected==='false') {
            expect(actual?.[0], expandedKey).eq( Boolean(expected));
        } else if (expected.startsWith('___regex___:')) {
            const regex = RegExp(expected.replace('___regex___:',''));
            expect(actual?.[0], expandedKey).match(regex);
        } else {
            expect(String(actual?.[0]), expandedKey).to.eq( expected);
        }
    });
}

export function buildModel<T>(data:TableDefinition) : T {
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

export class Dictionary {
    [key:string]: string;
}
