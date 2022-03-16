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
import 'reflect-metadata';
import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import {
    ProfilesService,
    DeviceProfile20Resource,
    GroupProfile20Resource,
    ASSETLIBRARY_CLIENT_TYPES,
} from '@cdf/assetlibrary-client/dist';
import stringify from 'json-stable-stringify';
import { fail } from 'assert';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
use(chai_string);
import { RESPONSE_STATUS, AUTHORIZATION_TOKEN } from '../common/common.steps';
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

const profileService:ProfilesService = container.get(ASSETLIBRARY_CLIENT_TYPES.ProfilesService);
function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN],
        Accept: 'application/vnd.aws-cdf-v2.0+json',
        'Content-Type': 'application/vnd.aws-cdf-v2.0+json',
    };
}

function isDevice(category:string) {
    return category==='device';
}

function isGroup(category:string) {
    return category==='group';
}

Given('assetlibrary {word} profile {string} of {string} does not exist', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await profileService.getDeviceProfile(templateId, profileId, getAdditionalHeaders(this));
        } else if (isGroup(category)) {
            await profileService.getGroupProfile(templateId, profileId, getAdditionalHeaders(this));
        }
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('assetlibrary {word} profile {string} of {string} exists', async function (category:string, profileId:string, templateId:string) {
    let profile;
    if (isDevice(category)) {
        profile = await profileService.getDeviceProfile(templateId, profileId, getAdditionalHeaders(this));
    } else if (isGroup(category)) {
        profile = await profileService.getGroupProfile(templateId, profileId, getAdditionalHeaders(this));
    }
    expect(profile.profileId).equalIgnoreCase(profileId);
});

When('I create the assetlibrary {word} profile {string} of {string} with attributes', async function (category:string, profileId:string, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const profile = {
        profileId,
        templateId
    };

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            profile[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            profile[key] = null;
        } else if (value==='___undefined___') {
            delete profile[key];
        } else {
            profile[key] = d[key];
        }
    });

    try {
        if (isDevice(category)) {
            await profileService.createDeviceProfile(profile, getAdditionalHeaders(this));
        } else if (isGroup(category)) {
            await profileService.createGroupProfile(profile, getAdditionalHeaders(this));
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete assetlibrary {word} profile {string} of {string}', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await profileService.deleteDeviceProfile(templateId, profileId, getAdditionalHeaders(this));
        } else if (isGroup(category)) {
            await profileService.deleteGroupProfile(templateId, profileId, getAdditionalHeaders(this));
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('assetlibrary {word} profile {string} of {string} exists with attributes', async function (category:string, profileId:string, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    let r:DeviceProfile20Resource|GroupProfile20Resource;
    if (isDevice(category)) {
        r = await profileService.getDeviceProfile(templateId, profileId, getAdditionalHeaders(this));
    } else if (isGroup(category)) {
        r = await profileService.getGroupProfile(templateId, profileId, getAdditionalHeaders(this));
    }

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
