/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { setDefaultTimeout, Then, Given, TableDefinition} from 'cucumber';
import {expect} from 'chai';
import config from 'config';
import { sign } from 'jsonwebtoken';

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

export function replaceTokens(text:string) {
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

    const token:any= {
        cdf_al: []
    };

    Object.keys(d).forEach( key => {
        token.cdf_al.push(`${key}:${d[key]}`);
    });

    const signedToken = sign(token, 'shared-secret');
    this[AUTHORIZATION_TOKEN]=signedToken;
});

Then('it fails with a {int}', function (status:number) {
    expect(this[RESPONSE_STATUS]).eq(status);
});
