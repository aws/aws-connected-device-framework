/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { setDefaultTimeout, Then, Given} from 'cucumber';
import {expect} from 'chai';
import config from 'config';

setDefaultTimeout(10 * 1000);

export const RESPONSE_STATUS = 'responseStatus';
export const TIME_SCENARIO_STARTED = 'scenarioTestStartedAt';

export function replaceTokens(text:string) {
    return text.replace(/%property:(.*?)%/g, function(_a,property) {
        return config.get(property);
    });
}

Given('I store the time the test started', function() {
    // just in case theres a slight difference between clocks, minus a few secodns
    this[TIME_SCENARIO_STARTED] = new Date(Date.now() - 200).toISOString();
});

Given('pause for {int}ms', async function (ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
});

Then('it fails with a {int}', function (status:number) {
    expect(this[RESPONSE_STATUS]).eq(status);
});
